FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew gradlew.bat build.gradle settings.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon -x test
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 storemate
COPY --from=build /app/build/libs/*SNAPSHOT.jar /app/app.jar
USER storemate
EXPOSE 8080
ENTRYPOINT ["java","-Duser.timezone=Asia/Seoul","-jar","/app/app.jar","--spring.profiles.active=prod"]
