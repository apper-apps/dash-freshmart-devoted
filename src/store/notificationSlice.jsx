import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { notificationService } from "@/services/api/notificationService";

const initialState = {
  counts: {
    payments: 0,
    products: 0,
    pos: 0,
    financial: 0,
    ai: 0,
    verification: 0,
    management: 0,
    delivery: 0,
    analytics: 0
  },
  notifications: [],
  loading: false,
  error: null,
  lastUpdated: null
};

export const fetchNotificationCounts = createAsyncThunk(
  'notifications/fetchCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getCounts();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
      return rejectWithValue(error.message || 'Failed to fetch notification counts');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    updateCounts: (state, action) => {
      state.counts = { ...state.counts, ...action.payload };
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    resetCount: (state, action) => {
      const { key } = action.payload;
      if (state.counts[key] !== undefined) {
        state.counts[key] = 0;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetAllCounts: (state) => {
      state.counts = {
        payments: 0,
        products: 0,
        pos: 0,
        financial: 0,
        ai: 0,
        verification: 0,
        management: 0,
        delivery: 0,
        analytics: 0
      };
      state.lastUpdated = new Date().toISOString();
    },
addNotification: (state, action) => {
      const notification = {
        id: Date.now().toString(),
        message: action.payload.message,
        type: action.payload.type || 'info',
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload
      };
      state.notifications.push(notification);
    },
    markAsRead: (state, action) => {
      const { id } = action.payload || {};
      if (id) {
        const notification = state.notifications.find(n => n.id === id);
        if (notification) {
          notification.read = true;
        }
      } else {
        // Mark all notifications as read if no ID provided
        state.notifications.forEach(notification => {
          notification.read = true;
        });
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationCounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationCounts.fulfilled, (state, action) => {
        state.loading = false;
        state.counts = { ...state.counts, ...action.payload };
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchNotificationCounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch notification counts';
      });
  }
});

export const {
  updateCounts,
  resetCount,
  setLoading,
  setError,
  clearError,
  resetAllCounts,
  addNotification,
  markAsRead
} = notificationSlice.actions;

export default notificationSlice.reducer;