package com.paoa

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.paoa.ui.navigation.AppNavGraph
import com.paoa.ui.theme.PAOATheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PAOATheme {
                AppNavGraph()
            }
        }
    }
}
