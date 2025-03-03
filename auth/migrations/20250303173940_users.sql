create table users (
    id int primary key,
    username varchar(20) not null unique,
    password varchar(255) not null
);
