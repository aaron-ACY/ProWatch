# ==============================================================================
# Stage 1: Build Spring Boot Application (Java 21 + Maven)
# ==============================================================================
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and pom.xml first to leverage Docker layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build executable JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==============================================================================
# Stage 2: Lightweight Production Runtime (Eclipse Temurin 21 JRE Alpine)
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create directory for fallback H2 database if running with 'local' profile
RUN mkdir -p /app/data

# Copy built JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Render dynamically injects PORT (defaults to 8080)
EXPOSE 8080

# Tune JVM memory for Render container limits (512MB Free / Starter instances)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar app.jar"]
