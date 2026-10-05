package com.paoa

import android.app.Application
import com.paoa.core.reminders.NotificationCoordinator
import com.paoa.data.local.PAOADatabase

class PAOAApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Initialize Notification Channels
        NotificationCoordinator(this)
        // Initialize local Room DB
        PAOADatabase.getInstance(this)
    }
}
