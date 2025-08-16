// HeartRateTracker.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle,
  Heart
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import BASE_URL from "../../src/config";

const API_BASE_URL = `${BASE_URL}/api/heart`; // Updated API URL
const USER_ID = 1; // Default user ID

// Define the type for heart rate records
interface HeartRateRecord {
  id: number;
  rate: number;
  notes: string | null;
  date_time: string;
}

const HeartRateTracker = () => {
  const [heartRate, setHeartRate] = useState('');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState<HeartRateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addingRecord, setAddingRecord] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HeartRateRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHeartHistory, setShowHeartHistory] = useState(false);
  
  useEffect(() => {
    fetchHeartRateRecords();
  }, []);

  const fetchHeartRateRecords = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      if (!token) {
        console.error('No token available for fetching heart rate records');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/gethr`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRecords(data.records || []);
      } else {
        console.error('Failed to fetch heart rate records:', data.error);
        Alert.alert('Error', data.error || 'Failed to fetch records');
      }
    } catch (error) {
      console.error('Fetch heart rate records error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addHeartRate = async () => {
    if (!heartRate.trim()) {
      Alert.alert('Error', 'Please enter a heart rate value');
      return;
    }

    const rateValue = parseInt(heartRate);
    if (isNaN(rateValue) || rateValue < 30 || rateValue > 250) {
      Alert.alert('Error', 'Please enter a valid heart rate (30-250 BPM)');
      return;
    }

    try {
      setLoading(true);
      setAddingRecord(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to record heart rate');
        setLoading(false);
        setAddingRecord(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/addhr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rate: rateValue,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();
      console.log('Backend response:', data); // Debug log

      if (response.ok) {
        Alert.alert('Success', 'Heart rate recorded successfully!');
        setHeartRate('');
        setNotes('');
        
        // Add the new record to the frontend immediately
        const newRecord: HeartRateRecord = {
          id: data.id || data.record?.id || Date.now(), // Try multiple possible ID locations
          rate: rateValue,
          notes: notes.trim() || null,
          date_time: data.date_time || data.record?.date_time || new Date().toISOString(),
        };
        
        console.log('Adding new record to frontend:', newRecord); // Debug log
        
        // Add the new record to the beginning of the list
        setRecords(prevRecords => {
          const updatedRecords = [newRecord, ...prevRecords];
          console.log('Updated records count:', updatedRecords.length); // Debug log
          return updatedRecords;
        });
        
        // Also fetch from backend to ensure consistency
        setTimeout(() => {
          fetchHeartRateRecords();
        }, 500);
      } else {
        console.error('Failed to record heart rate:', data.error);
        Alert.alert('Error', data.error || 'Failed to record heart rate');
      }
    } catch (error) {
      console.error('Add heart rate error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setAddingRecord(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHeartRateRecords();
  };

  const fetchHistory = async () => {
    try {
      console.log('Fetching heart rate history...'); // Debug log
      setLoadingHistory(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      
      if (!token) {
        console.error('No token available for fetching heart rate history');
        Alert.alert('Error', 'Please log in to view history');
        return;
      }

      console.log('Making API request to:', `${API_BASE_URL}/gethr`); // Debug log
      const response = await fetch(`${API_BASE_URL}/gethr`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', response.status); // Debug log
      const data = await response.json();
      console.log('Response data:', data); // Debug log
      
      if (response.ok) {
        const historyData = data.records || [];
        console.log('Setting history records:', historyData.length, 'records'); // Debug log
        setHistoryRecords(historyData);
        setShowHistory(true);
      } else {
        console.error('Failed to fetch heart rate history:', data.error);
        Alert.alert('Error', data.error || 'Failed to fetch history');
      }
    } catch (error) {
      console.error('Fetch heart rate history error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getHeartRateStatus = (rate: number) => {
    if (rate < 60) return { status: 'Low', color: 'text-[#11B5CF]', bg: 'bg-[#11B5CF]' };
    if (rate <= 100) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
    if (rate <= 150) return { status: 'Elevated', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'High', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Prepare chart data
  const getChartData = () => {
    if (records.length === 0) return null;

    const last7Records = records.slice(0, 7).reverse();
    const labels = last7Records.map((record, index) => {
      const date = new Date(record.date_time);
      return date.getDate() + '/' + (date.getMonth() + 1);
    });
    
    const data = last7Records.map(record => record.rate);

    return {
      labels,
      datasets: [{
        data,
        strokeWidth: 3,
      }]
    };
  };

  const screenWidth = Dimensions.get('window').width;
  const chartData = getChartData();

  return (
    <LinearGradient
      colors={['#D8BFD8', '#D8BFD8']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView 
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-center mt-6 mb-6">
          <Heart className="w-6 h-6 text-red-500 mr-8" />
          <Text className="text-2xl font-bold text-gray-800">
            Heart Rate Tracker
          </Text>
        </View>

        {/* Add Heart Rate Form */}
        <View className="m-4 p-6 rounded-2xl">
          <View className="mb-4">
            <Text className="text-gray-600 mb-2">Heart Rate (BPM)</Text>
            <TextInput
              className=" rounded-lg p-4 text-lg h-15 bg-white"
              placeholder="e.g., 75"
              value={heartRate}
              onChangeText={setHeartRate}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View className="mb-6">
            <Text className="text-gray-600 mb-2">Notes (optional)</Text>
            <TextInput
              className=" rounded-lg p-4 text-lg h-18 bg-white"
              placeholder="Add any notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
  className="rounded-2xl p-3 items-center border-4"
  style={{ borderColor: '#c77fc7ff' }}
  onPress={addHeartRate}
  disabled={loading}
>
  <Text style={{ color: '#c77fc7ff' }} className="text-lg font-semibold">
    {loading ? 'Recording...' : 'Record Heart Rate'}
  </Text>
</TouchableOpacity>
          
          {addingRecord && (
            <View className="mt-3 p-3 bg-green-100 rounded-lg flex-row items-center">
              <CheckCircle size={16} color="#16a34a" className="mr-2" />
              <Text className="text-green-700 font-medium">
                Record added! Refreshing data...
              </Text>
            </View>
          )}
        </View>

        {/* Chart Section */}
        {chartData && (
          <View className="m-4 p-6 rounded-2xl border border-black bg-transparent">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Heart Rate Trend</Text>
            <View className="items-center">
              <LineChart
                data={chartData}
                width={screenWidth - 80}
                height={180}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: { 
                    borderRadius: 16,
                    backgroundColor: '#ffffff'
                  },
                  propsForDots: {
                    r: '3',
                    strokeWidth: '2',
                    stroke: '#ffffff',
                  },
                }}
                bezier
                style={{ borderRadius: 16 }}
              />
            </View>
            <Text className="text-gray-500 text-center mt-2">Last 7 readings</Text>
          </View>
        )}



        {/* View History Button */}
        <View className="m-4">
  <TouchableOpacity
    className="rounded-2xl p-3 items-center border-4"
    style={{ borderColor: '#c77fc7ff' }}
    onPress={() => setShowHeartHistory(!showHeartHistory)}
    disabled={loadingHistory}
  >
    <Text style={{ color: '#c77fc7ff' }} className="text-lg font-semibold">
      {loadingHistory ? 'Loading...' : showHeartHistory ? 'Hide History' : 'View History'}
    </Text>
  </TouchableOpacity>
</View>

        {/* History Records */}
        {showHistory && (
          <View className="m-4 p-6 rounded-2xl border border-black mb-8">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Complete History ({historyRecords.length} records)</Text>
            {historyRecords.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-400">No history records found</Text>
              </View>
            ) : (
              <View>
                {historyRecords.map((record) => {
                  const status = getHeartRateStatus(record.rate);
                  return (
                    <View 
                      key={record.id} 
                      className="border-b border-gray-100 py-4 last:border-b-0"
                    >
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-gray-800">
                            {record.rate} BPM
                          </Text>
                          <Text className="text-sm text-gray-500">{formatDate(record.date_time)}</Text>
                        </View>
                        <View className={`${status.bg} rounded-full px-3 py-1`}>
                          <Text className="text-black text-xs font-semibold">{status.status}</Text>
                        </View>
                      </View>
                      {record.notes && (
                        <View className="bg-gray-50 rounded-lg p-3 mt-2">
                          <Text className="text-gray-600 text-sm">{record.notes}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default HeartRateTracker;