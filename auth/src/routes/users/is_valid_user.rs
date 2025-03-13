use actix_web::{web, HttpResponse, Responder};
use validator::Validate;

use crate::{helpers::check_user_exists, responses::error::GeneralError, AppState};

pub async fn is_valid_user(
    app_state: web::Data<AppState>,
    is_valid_user_data: web::Json<crate::validations::is_valid_user_data::IsValidUserData>,
) -> impl Responder {
    if let Err(e) = is_valid_user_data.validate() {
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

    let token_eval_result = crate::helpers::validate_token::validate_token(
        &is_valid_user_data.0.access_token,
        &app_state.access_token_secret,
    );

    if let Err(token_eval_result_err) = token_eval_result {
        return HttpResponse::Unauthorized().json(GeneralError {
            errors: token_eval_result_err,
        });
    }

    let claims = token_eval_result.unwrap();

    let user_exists =
        check_user_exists::check_user_exists(claims.user_id, &claims.username, &app_state).await;

    match user_exists {
        Err(err_string) => HttpResponse::BadRequest().json(GeneralError { errors: err_string }),
        Ok(_) => HttpResponse::Ok().json(()),
    }
}
