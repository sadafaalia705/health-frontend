import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, CheckCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import BASE_URL from '../../src/config';

interface SugarRecord {
  id: number;
  glucose_level: number;
  notes: string;
  fasting_state: string;
  timestamp: string;
}

export default function AddSugarReading() {
  const [glucose, setGlucose] = useState('');
  const [notes, setNotes] = useState('');
  const [fastingState, setFastingState] = useState<'Fasting' | 'Post-Meal'>('Fasting');
  const [records, setRecords] = useState<SugarRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addingRecord, setAddingRecord] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<SugarRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load sugar records from API
  useEffect(() => {
    fetchSugarRecords();
  }, []);

  const fetchSugarRecords = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token available, using sample data');
        // Fallback to sample data if no token
        const sampleData = [
          { id: 1, glucose_level: 120, notes: 'Morning reading', fasting_state: 'Fasting', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
          { id: 2, glucose_level: 135, notes: 'After meal', fasting_state: 'Post-Meal', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
          { id: 3, glucose_level: 128, notes: '', fasting_state: 'Fasting', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
          { id: 4, glucose_level: 142, notes: 'Stressful day', fasting_state: 'Post-Meal', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
        ];
        setRecords(sampleData);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/sugar/getsugar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to load sugar records:', response.status);
        // Fallback to sample data
        const sampleData = [
          { id: 1, glucose_level: 120, notes: 'Morning reading', fasting_state: 'Fasting', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
          { id: 2, glucose_level: 135, notes: 'After meal', fasting_state: 'Post-Meal', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
          { id: 3, glucose_level: 128, notes: '', fasting_state: 'Fasting', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
          { id: 4, glucose_level: 142, notes: 'Stressful day', fasting_state: 'Post-Meal', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
        ];
        setRecords(sampleData);
        return;
      }

      const data = await response.json();
      const formattedRecords = data.map((record: any) => ({
        id: record.id,
        glucose_level: record.glucose_level,
        notes: record.notes || '',
        fasting_state: record.fasting_state || 'Fasting',
        timestamp: record.recorded_at
      }));
      setRecords(formattedRecords);
    } catch (error) {
      console.error('Error loading sugar records:', error);
      // Fallback to sample data
      const sampleData = [
        { id: 1, glucose_level: 120, notes: 'Morning reading', fasting_state: 'Fasting', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
        { id: 2, glucose_level: 135, notes: 'After meal', fasting_state: 'Post-Meal', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 3, glucose_level: 128, notes: '', fasting_state: 'Fasting', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 4, glucose_level: 142, notes: 'Stressful day', fasting_state: 'Post-Meal', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
      ];
      setRecords(sampleData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Blood sugar categorization
  const categorizeSugar = (level: number) => {
    if (level < 70) {
      return { category: 'Low', color: 'text-[#11B5CF]', bg: 'bg-[#11B5CF]' };
    } else if (level >= 70 && level <= 99) {
      return { category: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
    } else if (level >= 100 && level <= 125) {
      return { category: 'Prediabetes', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    } else if (level >= 126) {
      return { category: 'High', color: 'text-red-600', bg: 'bg-red-100' };
    } else {
      return { category: 'Check', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // Input validation
  const validateInputs = () => {
    const glucoseValue = parseInt(glucose);

    if (!glucose) {
      Alert.alert('Error', 'Please enter a glucose level');
      return false;
    }

    if (isNaN(glucoseValue)) {
      Alert.alert('Error', 'Please enter a valid number');
      return false;
    }

    if (glucoseValue < 40 || glucoseValue > 400) {
      Alert.alert('Error', 'Glucose level should be between 40-400 mg/dL');
      return false;
    }

    return true;
  };

  // Record blood sugar
  const recordSugar = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
      setAddingRecord(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to record blood sugar');
        setLoading(false);
        setAddingRecord(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/sugar/addsugar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          glucose_level: parseInt(glucose),
          notes: notes.trim() || null,
          fasting_state: fastingState
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to record blood sugar:', response.status, errorText);
        Alert.alert('Error', `Failed to record blood sugar (${response.status}). Please try again.`);
        return;
      }

      const savedRecord = await response.json();
      
      const newRecord = {
        id: savedRecord.id,
        glucose_level: parseInt(glucose),
        notes: notes.trim(),
        fasting_state: fastingState,
        timestamp: savedRecord.recorded_at || new Date().toISOString()
      };

      setRecords(prev => [newRecord, ...prev]);
      setGlucose('');
      setNotes('');
      
      Alert.alert('Success', 'Blood sugar recorded successfully!');
      
      // Also fetch from backend to ensure consistency
      setTimeout(() => {
        fetchSugarRecords();
      }, 500);
      
      console.log('Blood sugar recorded successfully');
    } catch (error) {
      console.error('Error recording blood sugar:', error);
      Alert.alert('Error', 'Failed to record blood sugar. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setAddingRecord(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSugarRecords();
  };

  // Format date for display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Fetch history data
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to view history');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/sugar/getsugar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch history:', response.status, errorText);
        Alert.alert('Error', 'Failed to fetch history. Please try again.');
        return;
      }

      const data = await response.json();
      const formattedRecords = data.map((record: any) => ({
        id: record.id,
        glucose_level: record.glucose_level,
        notes: record.notes || '',
        fasting_state: record.fasting_state || 'Fasting',
        timestamp: record.recorded_at
      }));
      
      setHistoryRecords(formattedRecords);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch history. Please check your connection and try again.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Prepare chart data
  const getChartData = () => {
    if (records.length === 0) return null;

    const last7Records = records.slice(0, 7).reverse();
    const labels = last7Records.map((record, index) => {
      const date = new Date(record.timestamp);
      return date.getDate() + '/' + (date.getMonth() + 1);
    });
    
    const data = last7Records.map(record => record.glucose_level);

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
              <Activity className="w-6 h-6 text-purple-500 mr-8" />
              <Text className="text-2xl font-bold text-gray-800">
                Blood Sugar Tracker
              </Text>
            </View>

            {/* Add Blood Sugar Form */}
<View className="m-4 p-6 rounded-2xl">
  <View className="mb-4">
    <Text className="text-gray-600 mb-2">Glucose Level (mg/dL)</Text>
    <TextInput
      className="rounded-lg p-4 text-lg bg-white"
      placeholder="e.g., 120"
      value={glucose}
      onChangeText={setGlucose}
      keyboardType="numeric"
      maxLength={3}
    />
  </View>

  <View className="mb-6">
    <Text className="text-gray-600 mb-2">Notes (optional)</Text>
    <TextInput
      className="rounded-lg p-4 text-lg h-20 bg-white"
      placeholder="Add any notes..."
      value={notes}
      onChangeText={setNotes}
      multiline
      textAlignVertical="top"
    />
  </View>

  <View className="mb-6">
    <Text className="text-gray-600 mb-2">Fasting State</Text>
    <View className="flex-row">
      <TouchableOpacity
        className={`px-4 py-2 rounded-full mr-2 ${fastingState === 'Fasting' ? 'bg-black' : 'bg-gray-200'}`}
        onPress={() => setFastingState('Fasting')}
      >
        <Text className={`${fastingState === 'Fasting' ? 'text-white' : 'text-black'}`}>Fasting</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`px-4 py-2 rounded-full ${fastingState === 'Post-Meal' ? 'bg-black' : 'bg-gray-200'}`}
        onPress={() => setFastingState('Post-Meal')}
      >
        <Text className={`${fastingState === 'Post-Meal' ? 'text-white' : 'text-black'}`}>Post-Meal</Text>
      </TouchableOpacity>
    </View>
  </View>

{/* Record Button */}
<TouchableOpacity
  className="rounded-2xl p-3 items-center border-4 border-[#9370DB]"
  onPress={recordSugar}
  disabled={loading}
>
  <Text className="text-lg font-semibold text-[#9370DB]">
    {loading ? 'Recording...' : 'Record Blood Sugar'}
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
                <Text className="text-lg font-semibold text-gray-800 mb-4">Blood Sugar Trend</Text>
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

{/* View / Hide History Button */}
<View className="m-4">
  <TouchableOpacity
    className="rounded-2xl p-3 items-center border-4 border-[#9370DB]"
    onPress={() => {
      if (showHistory) {
        setShowHistory(false);
      } else {
        fetchHistory();
      }
    }}
    disabled={loadingHistory}
  >
    <Text className="text-lg font-semibold text-[#9370DB]">
      {loadingHistory ? 'Loading...' : showHistory ? 'Hide History' : 'View History'}
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
                      const status = categorizeSugar(record.glucose_level);
                      return (
                        <View 
                          key={record.id} 
                          className="border-b border-gray-100 py-4 last:border-b-0"
                        >
                          <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                              <Text className="text-lg font-semibold text-gray-800">
                                {record.glucose_level} mg/dL
                              </Text>
                              <Text className="text-sm text-gray-500">{formatDate(record.timestamp)}</Text>
                              <Text className="text-xs text-gray-500 italic mt-1">
                                {record.fasting_state === 'Fasting' ? 'Fasting reading' : 'Post-meal reading'}
                              </Text>
                            </View>
                            <View className={`${status.bg} rounded-full px-3 py-1`}>
                              <Text className="text-black text-xs font-semibold">{status.category}</Text>
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
}
