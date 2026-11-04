package com.aliucord.manager.patcher.util

/** Permit separate client instances without targeting Discord or this Manager. */
object ClientPackagePolicy {
    private val packagePattern = Regex("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+")

    fun isAllowed(packageName: String, managerPackage: String): Boolean =
        packageName.length in 3..150 && packagePattern.matches(packageName) &&
            packageName != managerPackage &&
            packageName != "com.discord" && !packageName.startsWith("com.discord.")
}
