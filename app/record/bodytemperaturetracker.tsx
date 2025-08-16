import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Calendar, Check, Thermometer } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import BASE_URL from "../../src/config";

interface TemperatureRecord {
  id: number;
  temperature: number;
  unit: 'C' | 'F';
  notes: string;
  timestamp: string;
}

const TemperatureTracker = () => {
  const [temperature, setTemperature] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState<TemperatureRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false); // NEW

  // Monitor records state changes
  useEffect(() => {
    console.log('Records state changed:', records.length, 'records');
  }, [records]);

  // Load temperature records from API on component mount
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        if (!token) {
          console.log('No token available, using sample data');
          // Fallback to sample data if no token
          const sampleData: TemperatureRecord[] = [
            { id: 1, temperature: 36.5, unit: 'C' as const, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: 2, temperature: 37.2, unit: 'C' as const, notes: 'After exercise', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 3, temperature: 36.8, unit: 'C' as const, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 4, temperature: 38.1, unit: 'C' as const, notes: 'Feeling feverish', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
          ];
          setRecords(sampleData);
          return;
        }

        const response = await fetch(`${BASE_URL}/api/temp/gettemp`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to load temperature records:', response.status, errorText);
          // Fallback to sample data
          const sampleData: TemperatureRecord[] = [
            { id: 1, temperature: 36.5, unit: 'C' as const, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: 2, temperature: 37.2, unit: 'C' as const, notes: 'After exercise', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 3, temperature: 36.8, unit: 'C' as const, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 4, temperature: 38.1, unit: 'C' as const, notes: 'Feeling feverish', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
          ];
          setRecords(sampleData);
          return;
        }

        const responseData = await response.json();
        console.log('Fetched temperature records:', responseData);
        
        // Handle the correct API response format
        const records = responseData.records || responseData;
        
        if (!Array.isArray(records)) {
          console.error('API response is not an array:', responseData);
          // Fallback to sample data
          const sampleData: TemperatureRecord[] = [
            { id: 1, temperature: 36.5, unit: 'C' as const, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: 2, temperature: 37.2, unit: 'C' as const, notes: 'After exercise', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 3, temperature: 36.8, unit: 'C' as const, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: 4, temperature: 38.1, unit: 'C' as const, notes: 'Feeling feverish', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
          ];
          setRecords(sampleData);
          return;
        }
        
        const formattedRecords = records.map((record: any) => {
          // Validate and sanitize the record data
          const temperature = parseFloat(record.temperature || record.temp_value || 0);
          const unit = record.unit || 'C';
          const notes = record.notes || record.notes_text || '';
          const timestamp = record.date_time || record.recorded_at || record.timestamp || record.created_at;
          
          // More reasonable temperature validation - allow up to 120°F (48.9°C) for fever cases
          if (!record.id || isNaN(temperature) || temperature <= 0 || temperature > 120 || !timestamp) {
            console.warn('Invalid temperature record found:', record);
            return null;
          }
          
          return {
            id: record.id,
            temperature: temperature,
            unit: unit,
            notes: notes,
            timestamp: timestamp
          };
        }).filter(record => record !== null);
        
        console.log('Processed records:', formattedRecords.length);
        setRecords(formattedRecords);
      } catch (error) {
        console.error('Error loading temperature records:', error);
        // Fallback to sample data
        const sampleData: TemperatureRecord[] = [
          { id: 1, temperature: 36.5, unit: 'C' as const, notes: 'Morning reading', timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
          { id: 2, temperature: 37.2, unit: 'C' as const, notes: 'After exercise', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
          { id: 3, temperature: 36.8, unit: 'C' as const, notes: '', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
          { id: 4, temperature: 38.1, unit: 'C' as const, notes: 'Feeling feverish', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
        ];
        setRecords(sampleData);
      }
    };

    loadRecords();
  }, []);

  // Convert between Celsius and Fahrenheit
  const convertTemperature = (value: number, fromUnit: 'C' | 'F', toUnit: 'C' | 'F') => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'C' && toUnit === 'F') return (value * 9/5) + 32;
    return (value - 32) * 5/9; // F to C
  };

  // Temperature categorization based on medical guidelines
  const categorizeTemperature = (temp: number, unit: 'C' | 'F') => {
    const tempC = unit === 'C' ? temp : convertTemperature(temp, 'F', 'C');
    
    if (tempC < 35.0) {
      return { category: 'Hypothermia', color: 'bg-blue-600', textColor: 'text-blue-600', urgency: 'URGENT' };
    } else if (tempC >= 35.0 && tempC < 36.1) {
      return { category: 'Low', color: 'bg-blue-400', textColor: 'text-blue-400', urgency: 'WATCH' };
    } else if (tempC >= 36.1 && tempC <= 37.2) {
      return { category: 'Normal', color: 'bg-green-500', textColor: 'text-green-500', urgency: 'GOOD' };
    } else if (tempC > 37.2 && tempC <= 38.0) {
      return { category: 'Elevated', color: 'bg-yellow-500', textColor: 'text-yellow-600', urgency: 'WATCH' };
    } else if (tempC > 38.0 && tempC <= 39.0) {
      return { category: 'Fever', color: 'bg-orange-500', textColor: 'text-orange-500', urgency: 'CONCERN' };
    } else {
      return { category: 'High Fever', color: 'bg-red-600', textColor: 'text-red-600', urgency: 'URGENT' };
    }
  };

  // Input validation
  const validateInputs = () => {
    const tempValue = parseFloat(temperature);

    if (!temperature) {
      Alert.alert('Error', 'Please enter temperature');
      return false;
    }

    if (isNaN(tempValue)) {
      Alert.alert('Error', 'Please enter a valid temperature number');
      return false;
    }

    if (unit === 'C' && (tempValue < 30 || tempValue > 50)) {
      Alert.alert('Error', 'Temperature should be between 30-50°C');
      return false;
    }

    if (unit === 'F' && (tempValue < 86 || tempValue > 122)) {
      Alert.alert('Error', 'Temperature should be between 86-122°F');
      return false;
    }

    return true;
  };

  // Record temperature
  const recordTemperature = async () => {
    if (!validateInputs()) return;

    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to record temperature');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/temp/addtemp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          temperature: parseFloat(temperature),
          unit: unit,
          notes: notes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to record temperature:', response.status, errorText);
        Alert.alert('Error', 'Failed to record temperature. Please try again.');
        return;
      }

      const savedRecord = await response.json();
      console.log('API Response:', savedRecord);
      
      const newRecord = {
        id: savedRecord.id,
        temperature: parseFloat(temperature),
        unit: unit,
        notes: notes.trim(),
        timestamp: savedRecord.recorded_at || new Date().toISOString()
      };

      setRecords(prev => [newRecord, ...prev]);
      setTemperature('');
      setNotes('');
      setShowResults(true);
      
      // Auto-hide results after 5 seconds
      setTimeout(() => setShowResults(false), 5000);
      
      console.log('Temperature recorded successfully');
    } catch (error) {
      console.error('Error recording temperature:', error);
      Alert.alert('Error', 'Failed to record temperature. Please check your connection and try again.');
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
    const avgTemp = recent.reduce((sum, r) => sum + r.temperature, 0) / recent.length;
    
    return { 
      avgTemp: Math.round(avgTemp * 10) / 10,
    };
  };

  // Prepare chart data (all converted to Celsius for consistency)
  const chartData = records.slice(0, 10).reverse().map((record, index) => {
    try {
      const temp = record.unit === 'C' ? record.temperature : convertTemperature(record.temperature, 'F', 'C');
      console.log(`Chart data record ${index}:`, { 
        original: record.temperature, 
        converted: temp, 
        unit: record.unit,
        isValid: temp != null && !isNaN(temp)
      });
      
      // Validate the temperature value - ensure it's a valid number
      if (temp == null || isNaN(temp) || temp <= 0 || temp > 120) {
        console.warn('Invalid temperature value for chart:', record);
        return null;
      }
      
      return {
        name: `${index + 1}`,
        temperature: Number(temp), // Ensure it's a number
        date: new Date(record.timestamp).toLocaleDateString()
      };
    } catch (error) {
      console.error('Error processing chart data record:', error, record);
      return null;
    }
  }).filter(item => {
    const isValid = item !== null && 
                   item.temperature != null && 
                   !isNaN(item.temperature) && 
                   typeof item.temperature === 'number' &&
                   item.temperature > 0 &&
                   item.temperature <= 120;
    if (!isValid && item !== null) {
      console.warn('Filtering out invalid temperature data:', item);
    }
    return isValid;
  });

  // Create safe chart labels that handle different date formats
  const createChartLabels = (data: Array<{ date: string; temperature: number; name: string } | null>) => {
    return data.map(d => {
      if (!d || !d.date) {
        return 'N/A';
      }
      try {
        const dateParts = d.date.split('/');
        if (dateParts.length >= 2) {
          return `${dateParts[1]}/${dateParts[0]}`;
        }
        // Fallback for different date formats
        return d.date;
      } catch (error) {
        console.warn('Error parsing date for chart label:', d.date);
        return 'N/A';
      }
    });
  };

  const trends = calculateTrends();
  const latestReading = records[0];

  // View History Button handler
  const handleViewHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to view history');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/temp/gettemp`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load temperature records:', response.status, errorText);
        Alert.alert('Error', 'Failed to load history. Please try again.');
        return;
      }

      const responseData = await response.json();
      console.log('Fetched temperature records:', responseData);
      
      // Handle the correct API response format
      const records = responseData.records || responseData;
      console.log('Raw records array:', records);
      console.log('Records length:', records.length);
      
      if (!Array.isArray(records)) {
        console.error('API response is not an array:', responseData);
        Alert.alert('Error', 'Invalid data format received from server');
        return;
      }
      
      const formattedRecords = records.map((record: any) => {
        console.log('Processing record:', record);
        const temperature = parseFloat(record.temperature || record.temp_value || 0);
        const unit = record.unit || 'C';
        const notes = record.notes || record.notes_text || '';
        const timestamp = record.date_time || record.recorded_at || record.timestamp || record.created_at;
        
        console.log('Parsed values:', { temperature, unit, notes, timestamp, id: record.id });
        
        if (!record.id || isNaN(temperature) || temperature <= 0 || temperature > 120 || !timestamp) {
          console.warn('Invalid temperature record found:', record);
          console.warn('Validation failed:', { 
            hasId: !!record.id, 
            isValidTemp: !isNaN(temperature) && temperature > 0 && temperature <= 120, 
            hasTimestamp: !!timestamp 
          });
          return null;
        }
        return {
          id: record.id,
          temperature: temperature,
          unit: unit,
          notes: notes,
          timestamp: timestamp
        };
      }).filter(record => record !== null);
      
      setRecords(formattedRecords);
      setRefreshKey(prev => prev + 1); // Force re-render
      setShowHistory(true); // SHOW HISTORY
      Alert.alert('Success', `History loaded successfully! Found ${formattedRecords.length} valid records.`);
    } catch (error) {
      console.error('Error loading temperature records:', error);
      Alert.alert('Error', 'Failed to load history. Please check your connection and try again.');
    }
  };

  return (
    <LinearGradient
      colors={['#f9ecb7ff', '#fceeb6ff']}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-center mt-10 mb-6">
  <Thermometer className="w-6 h-6 text-orange-500 mr-2" />
  <Text className="text-2xl font-bold text-gray-800">Body Temperature</Text>
</View>

{/* Input Form */}
<View className="m-2 p-6 rounded-2xl">
  <View className="mb-4">
    <Text className="text-gray-600 mb-2">Body Temperature</Text>
    <View className="flex-row items-center">
      <TextInput
        className=" rounded-lg p-4 text-lg flex-1 bg-white"
        placeholder={unit === 'C' ? 'e.g., 36.5' : 'e.g., 98.6'}
        value={temperature}
        onChangeText={setTemperature}
        keyboardType="decimal-pad"
        maxLength={5}
      />
      <View className="flex-row ml-2 rounded-lg overflow-hidden bg-white">
        <TouchableOpacity
          className={`px-4 py-4 ${unit === 'C' ? 'bg-orange-500' : 'bg-white'}`}
          onPress={() => setUnit('C')}
        >
          <Text className={`font-medium ${unit === 'C' ? 'text-white' : 'text-black'}`}>°C</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-4 ${unit === 'F' ? 'bg-orange-500' : 'bg-white'}`}
          onPress={() => setUnit('F')}
        >
          <Text className={`font-medium ${unit === 'F' ? 'text-white' : 'text-black'}`}>°F</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>

  <View className="mb-6">
    <Text className="text-gray-600 mb-2">Notes (optional)</Text>
    <TextInput
      className=" rounded-lg p-4 text-lg h-20 bg-white"
      placeholder="Add any notes..."
      value={notes}
      onChangeText={setNotes}
      multiline
      textAlignVertical="top"
    />
  </View>

  <TouchableOpacity
    className="rounded-2xl p-3 items-center border-4"
    style={{ borderColor: '#bfa300' }}
    onPress={recordTemperature}
  >
    <Text style={{ color: '#bfa300' }} className="text-lg font-semibold">Record Temperature</Text>
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
                const result = categorizeTemperature(latestReading.temperature, latestReading.unit);
                return (
                  <View>
                    <Text className="text-gray-600 mb-2">
                      Your temperature ({latestReading.temperature}°{latestReading.unit}) is
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

          {/* Chart - Only show if we have valid data */}
          {records.length > 0 && chartData.length > 0 && (
            <View className="m-4 p-6 rounded-2xl border border-black bg-transparent">
              <Text className="text-lg font-semibold text-gray-800 mb-4">Temperature Trend (°C)</Text>
              {(() => {
                const validChartData = chartData.filter((d): d is { date: string; temperature: number; name: string } => 
                  d !== null && 
                  d.temperature != null && 
                  !isNaN(d.temperature) && 
                  typeof d.temperature === 'number' &&
                  d.temperature > 0 &&
                  d.temperature <= 120
                );
                
                if (validChartData.length > 0) {
                  try {
                    // Ensure all data points are valid numbers
                    const chartValues = validChartData.map(d => {
                                          const value = Number(d.temperature);
                    return isNaN(value) || value <= 0 || value > 120 ? 36.5 : value; // fallback to normal temp
                    });
                    
                    return (
                      <View className="items-center">
                        <LineChart
                          data={{
                            labels: createChartLabels(validChartData),
                            datasets: [
                              {
                                data: chartValues,
                                color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`, // orange-500
                                strokeWidth: 3,
                              }
                            ],
                            legend: ['Temperature (°C)'],
                          }}
                          width={Dimensions.get('window').width - 48}
                          height={220}
                          yAxisSuffix="°"
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
                      </View>
                    );
                  } catch (error) {
                    console.error('Error rendering chart:', error);
                    return (
                      <View className="items-center py-8">
                        <Text className="text-gray-400">Error rendering chart</Text>
                        <Text className="text-gray-400 text-sm">Please try refreshing the data</Text>
                      </View>
                    );
                  }
                } else {
                  return (
                    <View className="items-center py-8">
                      <Text className="text-gray-400">No valid temperature data available for chart</Text>
                      <Text className="text-gray-400 text-sm">Record some temperature readings to see trends</Text>
                    </View>
                  );
                }
              })()}
              <View className="flex-row justify-center mt-2">
                <View className="flex-row items-center">
                  <View className="w-4 h-4 bg-orange-500 rounded mr-2"></View>
                  <Text className="text-sm text-gray-600">Temperature</Text>
                </View>
              </View>
            </View>
          )}

          {/* View History Button */}
          <View className="m-4">
  <TouchableOpacity
    className="rounded-2xl p-3 items-center border-4"
    style={{ borderColor: '#bfa300' }}
    onPress={() => setShowHistory(!showHistory)}
  >
    <View className="flex-row items-center">
      <Calendar className="w-5 h-5 mr-2" color="#bfa300" />
      <Text style={{ color: '#bfa300' }} className="text-lg font-semibold">
        {showHistory ? "Hide History" : "View History"}
      </Text>
    </View>
  </TouchableOpacity>
</View>

          {/* History Records Section - Only show after clicking View History */}
          {showHistory && records.length > 0 && (
            <View className="m-4 p-6 rounded-2xl border border-black mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-gray-800">History Records</Text>
                <View className="bg-orange-100 rounded-full px-3 py-1">
                  <Text className="text-orange-600 text-sm font-medium">{records.length} records</Text>
                </View>
              </View>
              {records.map((record) => {
                const result = categorizeTemperature(record.temperature, record.unit);
                return (
                  <View key={record.id} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-800">
                          {record.temperature}°{record.unit}
                          <Text className="text-sm font-normal text-gray-600">
                            {' '}({record.unit === 'C' ? 
                              Math.round(convertTemperature(record.temperature, 'C', 'F') * 10) / 10 :
                              Math.round(convertTemperature(record.temperature, 'F', 'C') * 10) / 10
                            }°{record.unit === 'C' ? 'F' : 'C'})
                          </Text>
                        </Text>
                        <Text className="text-sm text-gray-500">{formatDate(record.timestamp)}</Text>
                      </View>
                      <View className={`${result.color} rounded-full px-3 py-1`}>
                        <Text className="text-white text-xs font-semibold">{result.category}</Text>
                      </View>
                    </View>
                    {record.notes && (
                      <View className="bg-white rounded-lg p-3 mt-2 border border-gray-200">
                        <Text className="text-gray-600 text-sm">{record.notes}</Text>
                      </View>
                    )}
                    <View className="flex-row items-center mt-2">
                      {result.urgency === 'URGENT' && <AlertCircle className="w-4 h-4 text-red-500 mr-1" />}
                      <Text className={`text-xs ${result.textColor}`}>
                        {result.urgency === 'URGENT' && 'Seek immediate medical attention'}
                        {result.urgency === 'CONCERN' && 'Consult your healthcare provider'}
                        {result.urgency === 'WATCH' && 'Monitor closely'}
                        {result.urgency === 'GOOD' && 'Normal body temperature'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default TemperatureTracker;