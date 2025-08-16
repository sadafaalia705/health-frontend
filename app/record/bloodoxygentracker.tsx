import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, AlertCircle, Calendar, Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import BASE_URL from "../../src/config";

interface BloodOxygenRecord {
  id: number;
  oxygenLevel: number;
  heartRate?: number;
  notes: string;
  timestamp: string;
}

const BloodOxygenTracker = () => {
  const [oxygenLevel, setOxygenLevel] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState<BloodOxygenRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyRecords, setHistoryRecords] = useState<BloodOxygenRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Monitor records state changes
  useEffect(() => {
    console.log('Records state changed:', records.length, 'records');
  }, [records]);

  // Load blood oxygen records from API
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        if (!token) {
          console.log('No token available, using sample data');
          // Fallback to sample data if no token
          const sampleData = [
            { id: 1, oxygenLevel: 98, heartRate: 72, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: 2, oxygenLevel: 95, heartRate: 85, notes: 'After workout', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 3, oxygenLevel: 99, heartRate: 68, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 4, oxygenLevel: 94, heartRate: 78, notes: 'Feeling tired', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
          ];
          setRecords(sampleData);
          return;
        }

        const response = await fetch(`${BASE_URL}/api/auth/getoxygen`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to load blood oxygen records:', response.status, errorText);
          // Fallback to sample data
          const sampleData = [
            { id: 1, oxygenLevel: 98, heartRate: 72, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: 2, oxygenLevel: 95, heartRate: 85, notes: 'After workout', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 3, oxygenLevel: 99, heartRate: 68, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 4, oxygenLevel: 94, heartRate: 78, notes: 'Feeling tired', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
          ];
          setRecords(sampleData);
          return;
        }

        const data = await response.json();
        console.log('Fetched oxygen records:', data);
        const formattedRecords = data.map((record: any) => ({
          id: record.id,
          oxygenLevel: record.oxygen_level,
          heartRate: record.heart_rate || null,
          notes: record.notes || '',
          timestamp: record.recorded_at
        }));
        setRecords(formattedRecords);
      } catch (error) {
        console.error('Error loading blood oxygen records:', error);
        // Fallback to sample data
        const sampleData = [
          { id: 1, oxygenLevel: 98, heartRate: 72, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
          { id: 2, oxygenLevel: 95, heartRate: 85, notes: 'After workout', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
          { id: 3, oxygenLevel: 99, heartRate: 68, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
          { id: 4, oxygenLevel: 94, heartRate: 78, notes: 'Feeling tired', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
        ];
        setRecords(sampleData);
      }
    };

    loadRecords();
  }, []);

  // Blood oxygen categorization based on medical guidelines
  const categorizeOxygen = (level: number) => {
    if (level >= 98) {
      return { category: 'Excellent', color: 'bg-green-600', textColor: 'text-green-600', urgency: 'EXCELLENT' };
    } else if (level >= 95) {
      return { category: 'Normal', color: 'bg-green-500', textColor: 'text-green-500', urgency: 'GOOD' };
    } else if (level >= 90) {
      return { category: 'Low Normal', color: 'bg-yellow-500', textColor: 'text-yellow-600', urgency: 'WATCH' };
    } else if (level >= 85) {
      return { category: 'Low', color: 'bg-orange-500', textColor: 'text-orange-500', urgency: 'CONCERN' };
    } else {
      return { category: 'Critical', color: 'bg-red-600', textColor: 'text-red-600', urgency: 'URGENT' };
    }
  };

  // Input validation
  const validateInputs = () => {
    const oxygenValue = parseInt(oxygenLevel);
    const heartRateValue = heartRate ? parseInt(heartRate) : null;

    if (!oxygenLevel) {
      Alert.alert('Error', 'Please enter oxygen level');
      return false;
    }

    if (isNaN(oxygenValue)) {
      Alert.alert('Error', 'Please enter a valid oxygen level number');
      return false;
    }

    if (oxygenValue < 70 || oxygenValue > 100) {
      Alert.alert('Error', 'Oxygen level should be between 70-100%');
      return false;
    }

    if (heartRate && !isNaN(heartRateValue!) && (heartRateValue! < 40 || heartRateValue! > 220)) {
      Alert.alert('Error', 'Heart rate should be between 40-220 bpm');
      return false;
    }

    return true;
  };

  // Record blood oxygen
  const recordOxygen = async () => {
    if (!validateInputs()) return;

    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to record blood oxygen level');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/addoxygen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          oxygen_level: parseInt(oxygenLevel),
          heart_rate: heartRate ? parseInt(heartRate) : null,
          notes: notes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to record blood oxygen:', response.status, errorText);
        Alert.alert('Error', 'Failed to record blood oxygen level. Please try again.');
        return;
      }

      const savedRecord = await response.json();
      console.log('API Response:', savedRecord);
      
      const newRecord = {
        id: savedRecord.id,
        oxygenLevel: parseInt(oxygenLevel),
        heartRate: heartRate ? parseInt(heartRate) : undefined,
        notes: notes.trim(),
        timestamp: savedRecord.recorded_at || new Date().toISOString()
      };

      setRecords(prev => [newRecord, ...prev]);
      setOxygenLevel('');
      setHeartRate('');
      setNotes('');
      setShowResults(true);
      
      // Auto-hide results after 5 seconds
      setTimeout(() => setShowResults(false), 5000);
      
      console.log('Blood oxygen recorded successfully');
    } catch (error) {
      console.error('Error recording blood oxygen:', error);
      Alert.alert('Error', 'Failed to record blood oxygen level. Please check your connection and try again.');
    }
  };

  // Format date for display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate trends
  const calculateTrends = () => {
    if (records.length < 1) return null;
    
    const recent = records.slice(0, 5);
    const avgOxygen = recent.reduce((sum, r) => sum + r.oxygenLevel, 0) / recent.length;
    const heartRateReadings = recent.filter(r => r.heartRate);
    const avgHeartRate = heartRateReadings.length > 0 
      ? heartRateReadings.reduce((sum, r) => sum + r.heartRate!, 0) / heartRateReadings.length 
      : null;
    
    return { 
      avgOxygen: Math.round(avgOxygen * 10) / 10, 
      avgHeartRate: avgHeartRate ? Math.round(avgHeartRate) : null 
    };
  };

  // Prepare chart data
  const chartData = records.slice(0, 10).reverse().map((record, index) => ({
    name: `${index + 1}`,
    oxygen: record.oxygenLevel,
    heartRate: record.heartRate || 0,
    date: new Date(record.timestamp).toLocaleDateString()
  }));

  const trends = calculateTrends();
  const latestReading = records[0];

  return (
    <LinearGradient
      colors={['#fce4ec', '#fce4ec']}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header */}
         <View className="flex-row items-center justify-center mt-20 mb-7">
  <Activity className="w-6 h-6 text-[#00b8f1] mr-2" />
  <Text className="text-2xl font-bold text-gray-800">Blood Oxygen Level</Text>
</View>

          {/* Input Form */}
          <View className="m-2 p-6 rounded-2xl">
  <View className="mb-4">
    <Text className="text-gray-600 mb-2">Blood Oxygen Level (%)</Text>
    <TextInput
      className=" rounded-lg p-4 text-lg bg-white"   // changed bg-transparent → bg-white
      placeholder="e.g., 98"
      value={oxygenLevel}
      onChangeText={setOxygenLevel}
      keyboardType="numeric"
      maxLength={3}
    />
  </View>

  <View className="mb-4">
    <Text className="text-gray-600 mb-2">Heart Rate (optional, bpm)</Text>
    <TextInput
      className="rounded-lg p-4 text-lg bg-white"   // changed bg-transparent → bg-white
      placeholder="e.g., 72"
      value={heartRate}
      onChangeText={setHeartRate}
      keyboardType="numeric"
      maxLength={3}
    />
  </View>

  <View className="mb-6">
    <Text className="text-gray-600 mb-2">Notes (optional)</Text>
    <TextInput
      className="rounded-lg p-4 text-lg h-20 bg-white"   // changed bg-transparent → bg-white
      placeholder="Add any notes..."
      value={notes}
      onChangeText={setNotes}
      multiline
      textAlignVertical="top"
    />
  </View>

  <TouchableOpacity
    className="rounded-2xl p-3 items-center border-4 border-[#e1b5c4]"   // added border
    onPress={recordOxygen}
  >
    <Text className="text-lg font-semibold text-[#a45b6b]">Record Oxygen Level</Text> 
    {/* text color = darker shade of page bg (#fce4ec → darker shade #a45b6b) */}
  </TouchableOpacity>
</View>

          {/* Results Display */}
          {showResults && latestReading && (
            <View className="m-4 p-6 rounded-2xl border border-black">
              <View className="flex-row items-center mb-3">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <Text className="text-lg font-semibold text-gray-800">Reading Recorded Successfully!</Text>
              </View>
              {(() => {
                const result = categorizeOxygen(latestReading.oxygenLevel);
                return (
                  <View>
                    <Text className="text-gray-600 mb-2">
                      Your oxygen level ({latestReading.oxygenLevel}%{latestReading.heartRate ? `, HR: ${latestReading.heartRate} bpm` : ''}) is
                    </Text>
                    <View className={`${result.color} rounded-lg p-3 mb-2`}>
                      <Text className="text-white font-bold text-center">{result.category}</Text>
                    </View>
                    <Text className="text-sm text-gray-500 text-center">category</Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Chart */}
          <View className="m-4 p-6 rounded-2xl border border-black bg-transparent">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Oxygen Level Trend</Text>
            {records.length > 0 ? (
              <View className="items-center">
                <LineChart
                  data={{
                    labels: chartData.map(d => d.date.split('/')[1] + '/' + d.date.split('/')[0]),
                    datasets: [
                      {
                        data: chartData.map(d => d.oxygen),
                        color: (opacity = 1) => `rgba(0, 184, 241, ${opacity})`, // #00b8f1
                        strokeWidth: 3,
                      },
                      ...(chartData.some(d => d.heartRate > 0) ? [{
                        data: chartData.map(d => d.heartRate || 0),
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // red
                        strokeWidth: 2,
                      }] : []),
                    ],
                    legend: chartData.some(d => d.heartRate > 0) ? ['Oxygen Level (%)', 'Heart Rate (bpm)'] : ['Oxygen Level (%)'],
                  }}
                  width={Dimensions.get('window').width - 48}
                  height={220}
                  yAxisSuffix="%"
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: { 
                      borderRadius: 16,
                      backgroundColor: '#ffffff'
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#ffffff',
                    },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
                <View className="flex-row justify-center mt-2">
                  <View className="flex-row items-center mr-4">
                    <View className="w-4 h-4 bg-[#00b8f1] rounded mr-2"></View>
                    <Text className="text-sm text-gray-600">Oxygen Level</Text>
                  </View>
                  {chartData.some(d => d.heartRate > 0) && (
                    <View className="flex-row items-center">
                      <View className="w-4 h-4 bg-red-500 rounded mr-2"></View>
                      <Text className="text-sm text-gray-600">Heart Rate</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View className="items-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mb-2" />
                <Text className="text-gray-400">No data available</Text>
                <Text className="text-gray-400 text-sm">Record your first reading to see the trend</Text>
              </View>
            )}
          </View>

          {/* View History Button */}
{/* View / Hide History Button */}
<View className="m-4">
  <TouchableOpacity
    className="rounded-2xl p-3 items-center border-4 border-[#e1b5c4]"
    onPress={async () => {
      if (showHistory) {
        // Hide history if already shown
        setShowHistory(false);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Error', 'Please log in to view history');
          return;
        }

        const response = await fetch(`${BASE_URL}/api/auth/getoxygen`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to load blood oxygen records:', response.status, errorText);
          Alert.alert('Error', 'Failed to load history. Please try again.');
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          Alert.alert('Error', 'Invalid data format received from server');
          return;
        }

        const formattedRecords = data.map((record: any) => ({
          id: record.id,
          oxygenLevel: record.oxygen_level || record.oxygenLevel,
          heartRate: record.heart_rate || record.heartRate || null,
          notes: record.notes || '',
          timestamp: record.recorded_at || record.timestamp,
        }));

        setHistoryRecords(formattedRecords.filter(r => r.id && r.oxygenLevel && r.timestamp));
        setShowHistory(true);
      } catch (error) {
        console.error('Error loading blood oxygen records:', error);
        Alert.alert('Error', 'Failed to load history. Please check your connection and try again.');
      }
    }}
  >
    <Text className="text-lg font-semibold text-[#a45b6b]">
      {showHistory ? 'Hide History' : 'View History'}
    </Text>
  </TouchableOpacity>
</View>

          {/* History Section */}
          {showHistory && (
            <View className="m-4 p-6 rounded-2xl border border-black mb-8">
              <Text className="text-lg font-semibold text-gray-800 mb-4">Complete History</Text>
              {historyRecords.length === 0 ? (
                <View className="items-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                  <Text className="text-gray-400">No history records found</Text>
                  <Text className="text-gray-400 text-sm">Try refreshing the history</Text>
                </View>
              ) : (
                historyRecords.map((record) => {
                  const result = categorizeOxygen(record.oxygenLevel);
                  return (
                    <View key={record.id} className="border-b border-gray-100 py-4 last:border-b-0">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-gray-800">
                            {record.oxygenLevel}% SpO₂
                            {record.heartRate && (
                              <Text className="text-sm font-normal text-gray-600"> • {record.heartRate} bpm</Text>
                            )}
                          </Text>
                          <Text className="text-sm text-gray-500">{formatDate(record.timestamp)}</Text>
                        </View>
                        <View className={`${result.color} rounded-full px-3 py-1`}>
                          <Text className="text-white text-xs font-semibold">{result.category}</Text>
                        </View>
                      </View>
                      {record.notes && (
                        <View className="bg-gray-50 rounded-lg p-3 mt-2">
                          <Text className="text-gray-600 text-sm">{record.notes}</Text>
                        </View>
                      )}
                      <View className="flex-row items-center mt-2">
                        {result.urgency === 'URGENT' && <AlertCircle className="w-4 h-4 text-red-500 mr-1" />}
                        <Text className={`text-xs ${result.textColor}`}>
                          {result.urgency === 'URGENT' && 'Seek immediate medical attention'}
                          {result.urgency === 'CONCERN' && 'Consult your healthcare provider'}
                          {result.urgency === 'WATCH' && 'Monitor closely'}
                          {result.urgency === 'GOOD' && 'Normal oxygen levels'}
                          {result.urgency === 'EXCELLENT' && 'Excellent oxygen saturation'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default BloodOxygenTracker;