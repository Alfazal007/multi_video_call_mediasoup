use actix_web::{web, HttpResponse, Responder};
use validator::Validate;

use crate::{models::users::UserWithoutPassword, AppState};

pub async fn signup(
    app_state: web::Data<AppState>,
    sign_up_data: web::Json<crate::validations::signup::SignupData>,
) -> impl Responder {
    if let Err(e) = sign_up_data.validate() {
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

    let existing_user_res =
        sqlx::query_as::<_, UserWithoutPassword>("select * from users where username=$1")
            .bind(&sign_up_data.0.username)
            .fetch_optional(&app_state.database)
            .await;

    if existing_user_res.is_err() {
        return HttpResponse::InternalServerError().json(crate::responses::error::GeneralError {
            errors: "Issue talking to the database".to_string(),
        });
    }

    HttpResponse::Ok().json(())
}
