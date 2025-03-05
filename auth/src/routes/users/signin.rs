use actix_web::{
    cookie::{Cookie, SameSite},
    web, HttpResponse, Responder,
};
use bcrypt::verify;
use validator::Validate;

use crate::{helpers::generate_access_token::generate_token, models::users::User, AppState};

#[derive(serde::Serialize)]
struct LoginResponse {
    #[serde(rename = "userId")]
    user_id: i32,
    #[serde(rename = "accessToken")]
    access_token: String,
}

pub async fn signin(
    app_state: web::Data<AppState>,
    sign_in_data: web::Json<crate::validations::signup::SignupData>,
) -> impl Responder {
    if let Err(e) = sign_in_data.validate() {
        let mut validation_errors: Vec<String> = Vec::new();
        for (_, err) in e.field_errors().iter() {
            if let Some(message) = &err[0].message {
                validation_errors.push(message.clone().into_owned());
            }
        }
        if validation_errors.is_empty() {
            validation_errors.push("Invalid username".to_string())
        }
        return HttpResponse::BadRequest().json(crate::responses::error::ValidationErrors {
            errors: validation_errors,
        });
    }

    let user_from_db_res = sqlx::query_as::<_, User>("select * from users where username=$1")
        .bind(&sign_in_data.0.username)
        .fetch_optional(&app_state.database)
        .await;
    if user_from_db_res.is_err() {
        return HttpResponse::BadRequest().json(crate::responses::error::GeneralError {
            errors: "Issue talking to the database".to_string(),
        });
    }
    if user_from_db_res.as_ref().unwrap().is_none() {
        return HttpResponse::NotFound().json(crate::responses::error::GeneralError {
            errors: "User not found in the database".to_string(),
        });
    }

    let correct_password = verify(
        &sign_in_data.0.password,
        &user_from_db_res
            .as_ref()
            .unwrap()
            .as_ref()
            .unwrap()
            .password,
    );
    if correct_password.is_err() || !correct_password.unwrap() {
        return HttpResponse::BadRequest().json(crate::responses::error::GeneralError {
            errors: "Recheck the password".to_string(),
        });
    }

    let user_from_db = user_from_db_res.unwrap().unwrap();
    let access_token_res = generate_token(
        &user_from_db.username,
        user_from_db.id,
        &app_state.access_token_secret,
    );

    if access_token_res.is_err() {
        return HttpResponse::BadRequest().json(crate::responses::error::GeneralError {
            errors: "Issue generating the access token".to_string(),
        });
    }

    let cookie1 = Cookie::build("accessToken", access_token_res.as_ref().unwrap())
        .path("/")
        .secure(true)
        .http_only(true)
        .same_site(SameSite::None)
        .finish();

    let cookie2 = Cookie::build("userId", format!("{}", user_from_db.id))
        .path("/")
        .secure(true)
        .http_only(true)
        .same_site(SameSite::None)
        .finish();

    HttpResponse::Ok()
        .cookie(cookie1)
        .cookie(cookie2)
        .json(LoginResponse {
            user_id: user_from_db.id,
            access_token: access_token_res.unwrap(),
        })
}
