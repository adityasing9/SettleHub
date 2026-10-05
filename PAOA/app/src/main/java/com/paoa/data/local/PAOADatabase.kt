package com.paoa.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.paoa.data.local.dao.*
import com.paoa.data.local.entities.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        UserProfileEntity::class,
        UserPreferenceEntity::class,
        TaskEntity::class,
        TaskDependencyEntity::class,
        GoalEntity::class,
        ScheduleBlockEntity::class,
        FixedEventEntity::class,
        ReminderEntity::class,
        ConversationEntity::class,
        MessageEntity::class,
        MemoryEntity::class,
        BehavioralEventEntity::class,
        PostponementEntity::class,
        DailyReviewEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class PAOADatabase : RoomDatabase() {

    abstract fun taskDao(): TaskDao
    abstract fun scheduleBlockDao(): ScheduleBlockDao
    abstract fun reminderDao(): ReminderDao
    abstract fun memoryDao(): MemoryDao
    abstract fun behavioralDao(): BehavioralDao
    abstract fun profileDao(): ProfileDao
    abstract fun conversationDao(): ConversationDao

    companion object {
        @Volatile
        private var INSTANCE: PAOADatabase? = null

        fun getInstance(context: Context): PAOADatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    PAOADatabase::class.java,
                    "paoa_database.db"
                )
                    .addCallback(object : Callback() {
                        override fun onCreate(db: SupportSQLiteDatabase) {
                            super.onCreate(db)
                            // Prepopulate default profile and initial baseline memories
                            CoroutineScope(Dispatchers.IO).launch {
                                val database = getInstance(context)
                                database.profileDao().saveProfile(
                                    UserProfileEntity(
                                        id = 1L,
                                        name = "Aaditya",
                                        typicalWakeTime = "07:00",
                                        typicalSleepTime = "23:30",
                                        defaultReminderMode = "ALARM",
                                        defaultBufferMinutes = 15
                                    )
                                )
                                database.memoryDao().insertMemory(
                                    MemoryEntity(
                                        topic = "STUDY_PREFERENCE",
                                        fact = "Peak focus period is typically between 5:00 PM and 8:00 PM.",
                                        source = "INITIAL_CALIBRATION",
                                        confidence = 0.9
                                    )
                                )
                                database.memoryDao().insertMemory(
                                    MemoryEntity(
                                        topic = "SESSION_LIMIT",
                                        fact = "Prefers study sessions under 90 minutes. Split longer blocks into 45-min sessions.",
                                        source = "INITIAL_CALIBRATION",
                                        confidence = 0.85
                                    )
                                )
                                database.memoryDao().insertMemory(
                                    MemoryEntity(
                                        topic = "SOCIAL_ROUTINE",
                                        fact = "Evening outings with friends are normal and prioritized for wellbeing.",
                                        source = "INITIAL_CALIBRATION",
                                        confidence = 1.0
                                    )
                                )
                            }
                        }
                    })
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
