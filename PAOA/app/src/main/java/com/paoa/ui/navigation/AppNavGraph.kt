package com.paoa.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.paoa.ui.screens.assistant.AssistantScreen
import com.paoa.ui.screens.assistant.AssistantViewModel
import com.paoa.ui.screens.calendar.CalendarScreen
import com.paoa.ui.screens.calendar.CalendarViewModel
import com.paoa.ui.screens.home.HomeScreen
import com.paoa.ui.screens.home.HomeViewModel
import com.paoa.ui.screens.insights.InsightsScreen
import com.paoa.ui.screens.insights.InsightsViewModel
import com.paoa.ui.screens.settings.*
import com.paoa.ui.theme.*

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val homeViewModel: HomeViewModel = viewModel()
    val assistantViewModel: AssistantViewModel = viewModel()
    val calendarViewModel: CalendarViewModel = viewModel()
    val insightsViewModel: InsightsViewModel = viewModel()
    val settingsViewModel: SettingsViewModel = viewModel()

    val showBottomBar = currentRoute in BottomNavItems.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = SurfaceDark,
                    contentColor = TextPrimary
                ) {
                    BottomNavItems.forEach { screen ->
                        val selected = currentRoute == screen.route
                        NavigationBarItem(
                            icon = {
                                screen.icon?.let {
                                    Icon(
                                        imageVector = it,
                                        contentDescription = screen.title
                                    )
                                }
                            },
                            label = { Text(screen.title) },
                            selected = selected,
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = BackgroundDark,
                                selectedTextColor = PrimaryCyan,
                                indicatorColor = PrimaryCyan,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            ),
                            onClick = {
                                if (currentRoute != screen.route) {
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            }
                        )
                    }
                }
            }
        },
        containerColor = BackgroundDark
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = homeViewModel,
                    onNavigateToAssistant = { navController.navigate(Screen.Assistant.route) }
                )
            }
            composable(Screen.Assistant.route) {
                AssistantScreen(
                    viewModel = assistantViewModel
                )
            }
            composable(Screen.Calendar.route) {
                CalendarScreen(
                    viewModel = calendarViewModel
                )
            }
            composable(Screen.Insights.route) {
                InsightsScreen(
                    viewModel = insightsViewModel
                )
            }
            composable(Screen.Settings.route) {
                SettingsScreen(
                    viewModel = settingsViewModel,
                    onNavigateToPermissions = { navController.navigate(Screen.Permissions.route) },
                    onNavigateToDigitalTwin = { navController.navigate(Screen.DigitalTwin.route) }
                )
            }
            composable(Screen.Permissions.route) {
                PermissionsScreen(
                    viewModel = settingsViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable(Screen.DigitalTwin.route) {
                DigitalTwinScreen(
                    viewModel = settingsViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
