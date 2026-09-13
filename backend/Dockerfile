# Multi-stage build: compile with the full JDK, run on a slim JRE.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline
COPY src/ src/
RUN ./mvnw -B clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Tuned for CPU/RAM-constrained free-tier hosts: skip C2 JIT tiers and use the serial collector to
# cut cold-boot time, and cap heap/metaspace to stay well inside a 512MB container.
ENTRYPOINT ["java", \
  "-XX:TieredStopAtLevel=1", \
  "-XX:+UseSerialGC", \
  "-Xshare:auto", \
  "-Xmx384m", \
  "-XX:MaxMetaspaceSize=128m", \
  "-jar", "app.jar"]
