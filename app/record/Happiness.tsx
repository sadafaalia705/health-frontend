import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BASE_URL from '../../src/config';

// 29 Oxford Happiness Questions
const OXFORD_QUESTIONS = [
  { id: 1, text: "I don't feel particularly pleased with the way I am." },
  { id: 2, text: "I am intensely interested in other people." },
  { id: 3, text: "I feel that life is very rewarding." },
  { id: 4, text: "I have very warm feelings towards almost everyone." },
  { id: 5, text: "I rarely wake up feeling rested." },
  { id: 6, text: "I am not particularly optimistic about the future." },
  { id: 7, text: "I find most things amusing." },
  { id: 8, text: "I am always committed and involved." },
  { id: 9, text: "Life is good." },
  { id: 10, text: "I do not think that the world is a good place." },
  { id: 11, text: "I laugh a lot." },
  { id: 12, text: "I am well satisfied about everything in my life." },
  { id: 13, text: "I don't think I look attractive." },
  { id: 14, text: "There is a gap between what I would like to do and what I have done." },
  { id: 15, text: "I am very happy." },
  { id: 16, text: "I find beauty in some things." },
  { id: 17, text: "I always have a cheerful effect on others." },
  { id: 18, text: "I can fit in (find time for) everything I want to." },
  { id: 19, text: "I feel that I am not especially in control of my life." },
  { id: 20, text: "I feel able to take anything on." },
  { id: 21, text: "I feel fully mentally alert." },
  { id: 22, text: "I often experience joy and elation." },
  { id: 23, text: "I do not find it easy to make decisions." },
  { id: 24, text: "I do not have a particular sense of meaning and purpose in my life." },
  { id: 25, text: "I feel I have a great deal of energy." },
  { id: 26, text: "I usually have a good influence on events." },
  { id: 27, text: "I do not have fun with other people." },
  { id: 28, text: "I don't feel particularly healthy." },
  { id: 29, text: "I do not have particularly happy memories of the past." },
];

// Questions that need reverse scoring
const REVERSED_INDICES = [0, 4, 5, 9, 12, 13, 18, 22, 23, 26, 27, 28];

// Response options (6-point Likert scale)
const OPTIONS = [
  { value: 0, label: "Strongly disagree" },
  { value: 1, label: "Moderately disagree" },
  { value: 2, label: "Slightly disagree" },
  { value: 3, label: "Slightly agree" },
  { value: 4, label: "Moderately agree" },
  { value: 5, label: "Strongly agree" },
];

// Calculate Oxford Happiness Score
function calculateScore(responses: number[]) {
  return responses.reduce((acc, val, idx) =>
    acc + (REVERSED_INDICES.includes(idx) ? 5 - val : val), 0
  );
}

// Interpret the happiness score
function interpretScore(score: number) {
  const max = 29 * 5; // Maximum possible score: 145
  const pct = (score / max) * 100;
  
  if (pct >= 70) {
    return { 
      level: 'High', 
      tip: "You're flourishing — keep nurturing meaningful relationships and passions!" 
    };
  } else if (pct >= 50) {
    return { 
      level: 'Moderate', 
      tip: "You're doing well. Celebrate your wins and keep growing." 
    };
  } else {
    return { 
      level: 'Low', 
      tip: "It's okay to have ups and downs. Small joys and kind connections can help lift your mood." 
    };
  }
}

export default function OxfordHappinessScreen() {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState(Array(OXFORD_QUESTIONS.length).fill(null) as (number | null)[]);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<null | { score: number, level: string, tip: string }>(null);

  // Reset test whenever this screen is focused (navigated to)
  useFocusEffect(
    useCallback(() => {
      // Always reset to fresh state when screen is focused
      resetTest();
    }, [])
  );

  const resetTest = () => {
    setShowWelcome(true);
    setStep(0);
    setResponses(Array(OXFORD_QUESTIONS.length).fill(null));
    setShowResult(false);
    setResult(null);
  };

  const startAssessment = () => {
    setShowWelcome(false);
  };

  // Check if current question is answered
  const isAnswered = responses[step] !== null;

  const handleOption = (value: number) => {
    const updated = [...responses];
    updated[step] = value;
    setResponses(updated);
  };

  const handleNext = async () => {
    if (step < OXFORD_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Calculate & Show result
      const all = responses as number[];
      const score = calculateScore(all);
      const { level, tip } = interpretScore(score);
      setShowResult(true);
      setResult({ score, level, tip });

      // Save to API
      try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        if (!token) {
          console.log('No authentication token found, skipping API call');
          return;
        }

        const response = await fetch(`${BASE_URL}/api/healthscore/addscore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            score: score,
            level: level,
            tip: tip,
            timestamp: new Date().toISOString()
          }),
        });

        if (response.ok) {
          console.log('Happiness score saved successfully');
        } else {
          console.error('Response status:', response.status);
          console.error('Response headers:', Object.fromEntries(response.headers.entries()));
          
          const responseText = await response.text();
          console.error('Response body:', responseText);
          
          try {
            const errorData = JSON.parse(responseText);
            console.error('Failed to save happiness score:', errorData);
          } catch (parseError: any) {
            console.error('Failed to parse error response as JSON:', parseError.message);
            console.error('Raw response was:', responseText);
          }
        }
      } catch (error: any) {
        console.error('Error saving happiness score:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  // UI - Welcome Screen
  if (showWelcome) {
    return (
      <LinearGradient
        colors={['#f4c4f3', '#f4c4f3']} // Solid background color
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            
            {/* Header Card */}
            <View style={styles.headerCard}>
              <Text style={styles.headerTitle}>Happiness</Text>
              <Text style={styles.headerSubtitle}>Assessment Test</Text>
            </View>

            {/* Description Card */}
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionTitle}>About This Test</Text>
              <Text style={styles.descriptionText}>
                Take a quick science-based happiness assessment using the validated Oxford Happiness Questionnaire. 
                Get instant results and insights about your well-being.
              </Text>
              <View style={styles.testDetails}>
                <Text style={styles.testDetailItem}>📊 29 Questions</Text>
              </View>
              <View style={styles.testDetails}>
                <Text style={styles.testDetailItem}>⏱️ 5-7 Minutes</Text>
              </View>
              <View style={styles.testDetails}>
                <Text style={styles.testDetailItem}>📈 Insights</Text>
              </View>
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={startAssessment}
            >
              <LinearGradient
                colors={['#27a1ba', '#e4e2f7']}
                style={styles.buttonGradient}
              >
                <Text style={styles.startButtonText}>Start Assessment</Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // UI - Result Screen (Integrated)
  if (showResult && result) {
    return (
      <LinearGradient
        colors={['#f4c4f3', '#f4c4f3', '#f4c4f3', '#f4c4f3']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            
            <View style={styles.resultHeaderCard}>
              <Text style={styles.resultTitle}>Your Happiness Score</Text>
            </View>

            <View style={styles.resultCard}>
              <View style={styles.scoreContainer}>
                <Text style={styles.resultScore}>{result.score}</Text>
                <Text style={styles.resultLevel}>{result.level} Happiness</Text>
              </View>
              
              <View style={styles.tipContainer}>
                <Text style={styles.resultTip}>{result.tip}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={resetTest}>
              <LinearGradient colors={['#27a1ba', '#e4e2f7']} style={styles.buttonGradient}>
                <Text style={styles.actionButtonText}>Take Test Again</Text>
              </LinearGradient>
            </TouchableOpacity>

                          <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => router.replace('/navigation/tabs/HomePage')}
              >
                <Text style={styles.secondaryButtonText}>Back to Home</Text>
              </TouchableOpacity>

          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // UI - Assessment in Progress
  const progress = ((step + 1) / OXFORD_QUESTIONS.length) * 100;
  return (
    <LinearGradient
      colors={['#f4c4f3', '#f4c4f3', '#f4c4f3', '#f4c4f3']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.questionScreenContainer}>
          
          {/* Header */}
          <View style={styles.testHeaderCard}>
            <Text style={styles.testTitle}>Happiness Assessment</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                Question {step + 1} of {OXFORD_QUESTIONS.length}
              </Text>
            </View>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{OXFORD_QUESTIONS[step].text}</Text>
            
            <View style={styles.optionsContainer}>
              {OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionButton,
                    responses[step] === opt.value && styles.selectedOptionButton,
                  ]}
                  onPress={() => handleOption(opt.value)}
                >
                  <Text style={[
                    styles.optionText,
                    responses[step] === opt.value && styles.selectedOptionText
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navigationContainer}>
  <TouchableOpacity
    style={[styles.navButton, styles.iconButton, step === 0 && styles.navButtonDisabled]}
    onPress={handlePrev}
    disabled={step === 0}
  >
    <Ionicons 
      name="chevron-back" 
      size={24} 
      color={step === 0 ? '#a0aec0' : '#667eea'} 
    />
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.navButton, styles.iconButton, !isAnswered && styles.navButtonDisabled]}
    onPress={handleNext}
    disabled={!isAnswered}
  >
      <Ionicons 
        name="chevron-forward" 
        size={24} 
        color="#667eea" 
      />
  </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// All styles in one place (no external commonStyles needed)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Constants.statusBarHeight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  questionScreenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  
  // Welcome Screen Styles
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
    textAlign: 'center',
  },
  descriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 20,
  },
  testDetails: {
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  testDetailItem: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    textAlign: 'center',
  },
  startButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Result Screen Styles
  resultHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  resultLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  tipContainer: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  resultTip: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Test Screen Styles
  testHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 8,
    flex: 1,
    justifyContent: 'space-evenly',
  },
  optionButton: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 50,
  },
  selectedOptionButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderColor: '#667eea',
  },
  optionText: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#667eea',
    fontWeight: '700',
  },
  
  // Navigation Styles
  navigationContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    justifyContent: 'center',
  },
  navButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  nextButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#a0aec0',
  },
  nextButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  
  // Action Buttons
  actionButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
});
