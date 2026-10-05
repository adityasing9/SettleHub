package com.paoa.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector? = null) {
    data object Home : Screen("home", "Home", Icons.Default.Home)
    data object Assistant : Screen("assistant", "Assistant", Icons.Default.AutoAwesome)
    data object Calendar : Screen("calendar", "Calendar", Icons.Default.CalendarMonth)
    data object Insights : Screen("insights", "Insights", Icons.Default.Insights)
    data object Settings : Screen("settings", "Settings", Icons.Default.Settings)

    // Sub-screens
    data object Permissions : Screen("permissions", "Permissions & Device Control")
    data object DigitalTwin : Screen("digital_twin", "What I Know About You")
}

val BottomNavItems = listOf(
    Screen.Home,
    Screen.Assistant,
    Screen.Calendar,
    Screen.Insights,
    Screen.Settings
)
