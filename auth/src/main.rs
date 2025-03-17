use std::env;

use actix_cors::Cors;
use actix_web::middleware::{from_fn, Logger};
use actix_web::{http, App, HttpServer};

use actix_web::web;
use routes::users::current_user::get_current_user;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

pub mod helpers;
pub mod middlewares;
pub mod models;
pub mod responses;
pub mod routes;
pub mod validations;

pub struct AppState {
    pub database: Pool<Postgres>,
    pub access_token_secret: String,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().expect("Issue loading env variables");
    env_logger::Builder::new().parse_filters("info").init();
    let database_url = env::var("DATABASE_URL").expect("Database url not provided");
    let access_token_secret = env::var("ACCESS_TOKEN_SECRET").expect("Database url not provided");
    let postgres_pool_connection = PgPoolOptions::new()
        .min_connections(3)
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Issue connecting to the database");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://192.168.69.11:5173")
            .allowed_origin("http://localhost:5173")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                http::header::CONTENT_TYPE,
                http::header::AUTHORIZATION,
            ])
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(web::Data::new(AppState {
                database: postgres_pool_connection.clone(),
                access_token_secret: access_token_secret.clone(),
            }))
            .service(
                web::scope("/api/v1/user")
                    .route("/signup", web::post().to(routes::users::signup::signup))
                    .route("/signin", web::post().to(routes::users::signin::signin))
                    .route(
                        "/isValidUser",
                        web::post().to(routes::users::is_valid_user::is_valid_user),
                    )
                    .service(
                        web::scope("/protected")
                            .wrap(from_fn(middlewares::auth_middleware::auth_middleware))
                            .route("/currentUser", web::get().to(get_current_user)),
                    ),
            )
    })
    .bind(("0.0.0.0", 8000))?
    .run()
    .await
}
// https://medium.com/@kimaswaemma36/mediasoup-essentials-creating-robust-webrtc-applications-a6c2ca4aafd1
// https://webrtcforthecurious.com/
// https://mediasoup.org/documentation/
