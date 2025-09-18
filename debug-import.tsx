import React from 'react';
import { View, Text } from 'react-native';

// Test different import approaches
try {
  console.log('=== Testing shared-core imports ===');
  
  // Test 1: Import everything
  const sharedCore = require('@gammon/shared-core');
  console.log('1. Full import keys:', Object.keys(sharedCore));
  console.log('1. getMovementApiClient type:', typeof sharedCore.getMovementApiClient);
  console.log('1. getMovementApiClient value:', sharedCore.getMovementApiClient);
  
  // Test 2: Direct destructuring
  const { getMovementApiClient } = require('@gammon/shared-core');
  console.log('2. Destructured getMovementApiClient type:', typeof getMovementApiClient);
  console.log('2. Destructured getMovementApiClient value:', getMovementApiClient);
  
  // Test 3: ES6 import (this is what the actual file uses)
  import * as SharedCore from '@gammon/shared-core';
  console.log('3. ES6 import keys:', Object.keys(SharedCore));
  console.log('3. ES6 getMovementApiClient type:', typeof SharedCore.getMovementApiClient);
  
} catch (error) {
  console.error('Import test error:', error);
}

export default function DebugImport() {
  return (
    <View style={{ padding: 20 }}>
      <Text>Check console for import debug info</Text>
    </View>
  );
}