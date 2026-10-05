package com.paoa.core.device

import android.Manifest
import android.app.AlarmManager
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.content.ContextCompat

class DevicePermissionManager(private val context: Context) {

    data class PermissionItem(
        val key: String,
        val title: String,
        val description: String,
        val isGranted: Boolean,
        val isRequiredForCore: Boolean = false
    )

    fun getPermissionsState(): List<PermissionItem> {
        val list = mutableListOf<PermissionItem>()

        // 1. Microphone
        val micGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        list.add(
            PermissionItem(
                key = Manifest.permission.RECORD_AUDIO,
                title = "Microphone & Voice Input",
                description = "Enables hands-free voice commands and spoken responses.",
                isGranted = micGranted,
                isRequiredForCore = false
            )
        )

        // 2. Notifications
        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        list.add(
            PermissionItem(
                key = "POST_NOTIFICATIONS",
                title = "Notifications & Reminders",
                description = "Delivers activity alerts before tasks start and dynamic rescheduling updates.",
                isGranted = notifGranted,
                isRequiredForCore = true
            )
        )

        // 3. Exact Alarms
        val exactAlarmGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.canScheduleExactAlarms() ?: false
        } else {
            true
        }
        list.add(
            PermissionItem(
                key = "SCHEDULE_EXACT_ALARM",
                title = "Exact Alarms",
                description = "Fires wake-up alarms at the exact minute even when the device is sleeping.",
                isGranted = exactAlarmGranted,
                isRequiredForCore = false
            )
        )

        // 4. Usage Statistics
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && appOps != null) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            AppOpsManager.MODE_DEFAULT
        }
        val usageGranted = mode == AppOpsManager.MODE_ALLOWED
        list.add(
            PermissionItem(
                key = "PACKAGE_USAGE_STATS",
                title = "App Screen Time & Focus Stats",
                description = "Optional tracking of productive vs distraction apps on device.",
                isGranted = usageGranted,
                isRequiredForCore = false
            )
        )

        return list
    }

    fun openAppSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    fun openExactAlarmSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.fromParts("package", context.packageName, null)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }
    }

    fun openUsageAccessSettings() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }
}
