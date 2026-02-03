import { apiClient, API_KEY } from './config';

/**
 * Workout API Service
 * All backend communication for workout-related operations
 */

export const workoutAPI = {
  /**
   * Log a new workout via text input
   * @param {string} workoutText - Raw text to be parsed by backend
   * @returns {Promise} Response from backend
   */
  logWorkout: async (workoutText) => {
    try {
      const response = await apiClient.post('/webhook/log_workout', {
        text: workoutText,
        api_key: API_KEY,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to log workout');
    }
  },

  /**
   * Fetch all workouts
   * @returns {Promise} Array of workout objects
   */
  getWorkouts: async () => {
  try {
      const response = await apiClient.get(`/api/get_all_workouts?api_key=${API_KEY}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch workouts');
    }
  },

  /**
   * Fetch workout history for a specific exercise
   * @param {string} exerciseName - Name of the exercise
   * @returns {Promise} Exercise history data
   */
  getExerciseHistory: async (exerciseName) => {
    try {
      const response = await apiClient.get(`/api/get_exercise_history/${encodeURIComponent(exerciseName)}?api_key=${API_KEY}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch exercise history');
    }
  },
};
