package com.paoa.ui.screens.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paoa.domain.model.BlockType
import com.paoa.domain.model.ScheduleBlock
import com.paoa.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
    val dateFormat = SimpleDateFormat("EEE, MMM d", Locale.getDefault())

    LaunchedEffect(Unit) {
        viewModel.loadBlocksForCurrentSelection()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(horizontal = 20.dp, vertical = 20.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Calendar",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = dateFormat.format(Date(state.selectedDateMillis)),
                    style = MaterialTheme.typography.bodyMedium,
                    color = PrimaryCyan
                )
            }

            IconButton(
                onClick = { viewModel.triggerAutoReschedule() },
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(SurfaceDark)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Optimize", tint = PrimaryCyan)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // View Mode Switcher
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceDark)
                .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            val modes = listOf(
                CalendarViewMode.DAY to "Day",
                CalendarViewMode.THREE_DAY to "3-Day",
                CalendarViewMode.WEEK to "Week",
                CalendarViewMode.MONTH to "Month"
            )

            for ((mode, label) in modes) {
                val isSelected = state.viewMode == mode
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSelected) PrimaryCyan else Color.Transparent)
                        .clickable { viewModel.setViewMode(mode) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) BackgroundDark else TextSecondary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Schedule Blocks Timeline List
        if (state.blocks.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "No activities scheduled.",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Tell the assistant what to schedule or tap optimize.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.blocks) { block ->
                    val blockBg = when (block.blockType) {
                        BlockType.UNAVAILABLE -> UnavailableColor
                        BlockType.BUFFER -> BufferColor
                        else -> SurfaceDark
                    }

                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = blockBg),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SurfaceBorderDark, RoundedCornerShape(14.dp))
                            .clickable { viewModel.selectBlockForExplanation(block) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = block.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${timeFormat.format(Date(block.startTime))} – ${timeFormat.format(Date(block.endTime))}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PrimaryCyan
                                )
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Color(block.priority.colorHex).copy(alpha = 0.2f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = block.priority.displayName.uppercase(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color(block.priority.colorHex),
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.Default.Info, contentDescription = "Explain", tint = TextMuted, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    // Explanation Dialog
    state.selectedBlockForExplanation?.let { block ->
        AlertDialog(
            onDismissRequest = { viewModel.selectBlockForExplanation(null) },
            confirmButton = {
                TextButton(onClick = { viewModel.selectBlockForExplanation(null) }) {
                    Text("Close", color = PrimaryCyan)
                }
            },
            title = {
                Text(
                    text = block.title,
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary
                )
            },
            text = {
                Column {
                    Text(
                        text = "Scheduling Rationale:",
                        style = MaterialTheme.typography.labelSmall,
                        color = PrimaryCyan,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = block.scheduleExplanation.ifBlank {
                            "Positioned dynamically according to priority constraints and your historical focus window."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(16.dp)
        )
    }
}
