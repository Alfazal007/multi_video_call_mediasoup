use std::env;

use actix_web::middleware::Logger;
use actix_web::{App, HttpServer};

use actix_web::web;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

pub mod models;
pub mod responses;
pub mod routes;
pub mod validations;

pub struct AppState {
    pub database: Pool<Postgres>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().expect("Issue loading env variables");
    env_logger::Builder::new().parse_filters("info").init();
    let database_url = env::var("DATABASE_URL").expect("Database url not provided");
    let postgres_pool_connection = PgPoolOptions::new()
        .min_connections(3)
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Issue connecting to the database");

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(AppState {
                database: postgres_pool_connection.clone(),
            }))
            .service(
                web::scope("/api/v1/user")
                    .route("/signup", web::post().to(routes::users::signup::signup)),
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
// https://medium.com/@kimaswaemma36/mediasoup-essentials-creating-robust-webrtc-applications-a6c2ca4aafd1
// https://webrtcforthecurious.com/
// https://mediasoup.org/documentation/
