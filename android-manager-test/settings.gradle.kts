@file:Suppress("UnstableApiUsage")

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

pluginManagement {
    repositories {
        google()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            name = "aliucord"
            url = uri("https://maven.aliucord.com/snapshots")
        }
    }
}

rootProject.name = "RainManager"
include(":app")
