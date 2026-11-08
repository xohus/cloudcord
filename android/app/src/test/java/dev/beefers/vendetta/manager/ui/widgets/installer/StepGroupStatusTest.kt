package dev.beefers.vendetta.manager.ui.widgets.installer

import dev.beefers.vendetta.manager.installer.step.StepStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class StepGroupStatusTest {
    @Test
    fun mixedSuccessfulAndQueuedStepsAreNotMarkedAsFailed() {
        assertEquals(
            StepStatus.QUEUED,
            aggregateStepStatus(listOf(StepStatus.SUCCESSFUL, StepStatus.QUEUED))
        )
    }

    @Test
    fun groupIsFailedOnlyWhenAStepFailed() {
        assertEquals(
            StepStatus.UNSUCCESSFUL,
            aggregateStepStatus(listOf(StepStatus.SUCCESSFUL, StepStatus.UNSUCCESSFUL, StepStatus.QUEUED))
        )
    }

    @Test
    fun ongoingStepTakesPrecedenceOverCompletedSteps() {
        assertEquals(
            StepStatus.ONGOING,
            aggregateStepStatus(listOf(StepStatus.SUCCESSFUL, StepStatus.ONGOING))
        )
    }

    @Test
    fun activeGroupStaysOngoingBetweenSteps() {
        assertEquals(
            StepStatus.ONGOING,
            aggregateStepStatus(listOf(StepStatus.SUCCESSFUL, StepStatus.QUEUED), isActive = true)
        )
    }

    @Test
    fun allSuccessfulStepsMarkGroupSuccessful() {
        assertEquals(
            StepStatus.SUCCESSFUL,
            aggregateStepStatus(listOf(StepStatus.SUCCESSFUL, StepStatus.SUCCESSFUL))
        )
    }
}
