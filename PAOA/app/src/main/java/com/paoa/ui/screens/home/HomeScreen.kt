package com.paoa.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paoa.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateToAssistant: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    var showRationaleDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundDark)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 20.dp, vertical = 24.dp)
        ) {
            // Header
            Text(
                text = "${state.greeting}, ${state.userName}",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Your day is calibrated to your natural rhythm.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
            )

            // "WHAT SHOULD I DO NOW?" Card
            Text(
                text = "WHAT SHOULD I DO NOW?",
                style = MaterialTheme.typography.labelSmall,
                color = PrimaryCyan,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            val rec = state.recommendation
            if (rec != null) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, SurfaceBorderDark, RoundedCornerShape(16.dp))
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = rec.task.title,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color(rec.task.priority.colorHex).copy(alpha = 0.2f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = rec.task.priority.displayName.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(rec.task.priority.colorHex),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
                        val timeStr = if (rec.scheduledBlock != null) {
                            "${timeFormat.format(Date(rec.scheduledBlock.startTime))} – ${timeFormat.format(Date(rec.scheduledBlock.endTime))}"
                        } else {
                            "Flexible window • ~${rec.task.estimatedDurationMinutes} mins"
                        }

                        Text(
                            text = timeStr,
                            style = MaterialTheme.typography.bodyLarge,
                            color = PrimaryCyan
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Brief rationale summary
                        Text(
                            text = rec.rationale,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            maxLines = 3
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { viewModel.startTask(rec.task) },
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = BackgroundDark)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Start", color = BackgroundDark, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { showRationaleDialog = true },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(SurfaceBorderDark)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = SecondaryIndigo)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Why AI?")
                            }

                            IconButton(
                                onClick = { viewModel.completeTask(rec.task) },
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(SurfaceVariantDark)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Done", tint = PriorityFlexible)
                            }
                        }
                    }
                }
            } else {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, SurfaceBorderDark, RoundedCornerShape(16.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "You are currently free.",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        Text(
                            text = "No pending tasks required right now. Rest or ask AI to schedule something.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                        )
                        Button(
                            onClick = onNavigateToAssistant,
                            colors = ButtonDefaults.buttonColors(containerColor = SecondaryIndigo),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Plan Something")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // "NEXT ACTIVITY" Section
            Text(
                text = "NEXT",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            val next = state.nextBlock
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorderDark, RoundedCornerShape(14.dp))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = next?.title ?: "No further commitments today",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        val nextTime = if (next != null) {
                            SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(next.startTime))
                        } else {
                            "Evening is open for relaxation"
                        }
                        Text(
                            text = nextTime,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted
                        )
                    }
                    if (next != null) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(SurfaceVariantDark)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = next.blockType.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // "TODAY'S SUMMARY" Section
            Text(
                text = "TODAY",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorderDark, RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${state.completedCount} of ${state.totalCount} tasks completed",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        val pct = if (state.totalCount > 0) (state.completedCount * 100) / state.totalCount else 0
                        Text(
                            text = "$pct%",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryCyan
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    val progress = if (state.totalCount > 0) state.completedCount.toFloat() / state.totalCount.toFloat() else 0f
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = PrimaryCyan,
                        trackColor = SurfaceVariantDark,
                    )
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }

        // Floating Mic Action Button
        FloatingActionButton(
            onClick = onNavigateToAssistant,
            containerColor = PrimaryCyan,
            contentColor = BackgroundDark,
            shape = CircleShape,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp)
        ) {
            Icon(
                Icons.Default.Mic,
                contentDescription = "Voice Assistant",
                modifier = Modifier.size(28.dp)
            )
        }
    }

    val recommendation = state.recommendation
    if (showRationaleDialog && recommendation != null) {
        AlertDialog(
            onDismissRequest = { showRationaleDialog = false },
            confirmButton = {
                TextButton(onClick = { showRationaleDialog = false }) {
                    Text("Understood", color = PrimaryCyan)
                }
            },
            title = {
                Text(
                    text = "Why this activity now?",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary
                )
            },
            text = {
                Column {
                    Text(
                        text = recommendation.rationale,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = recommendation.scheduledBlock?.scheduleExplanation ?: "Optimized based on your historical peak focus and availability.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(16.dp)
        )
    }
}
