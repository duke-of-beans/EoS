// ============================================
// EXAMPLE: Before Auto-Patching
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import lodash from 'lodash';  // Unused import
import moment from 'moment';   // Unused import

const API_KEY = 'sk_live_EXAMPLE_KEY_REDACTED';  // Hardcoded secret!

export function DataFetcher({ endpoint }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  console.log('DataFetcher rendering');  // Unguarded console

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Unguarded await - no try-catch!
      const response = await axios.get(endpoint, {
        headers: { 'X-API-Key': API_KEY }
      });

      console.log('Response:', response);  // Another unguarded console
      setData(response.data);
      setLoading(false);
    };

    // Event listener without cleanup
    window.addEventListener('resize', handleResize);

    fetchData();
  }, [endpoint]);

  function handleResize() {
    console.log('Window resized');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Debug: Current data', data);  // This one is guarded - OK!
  }

  return <div>{loading ? 'Loading...' : JSON.stringify(data)}</div>;
}

// Using deprecated webpack plugin
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// ============================================
// EXAMPLE: After Auto-Patching
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
// ✅ Unused imports removed automatically

const API_KEY = 'sk_live_EXAMPLE_KEY_REDACTED';  // ⚠️ HIGH RISK - Not auto-fixed!
// 💡 Suggestion: Move to environment variable: process.env.API_KEY

export function DataFetcher({ endpoint }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Unguarded console.log removed

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // ⚠️ MEDIUM RISK - Unguarded await not auto-fixed
      // 💡 Suggestion: Wrap in try-catch block
      const response = await axios.get(endpoint, {
        headers: { 'X-API-Key': API_KEY }
      });

      // ✅ Unguarded console.log removed
      setData(response.data);
      setLoading(false);
    };

    // ⚠️ MEDIUM RISK - Event listener without cleanup
    // 💡 Suggestion: Add removeEventListener in cleanup
    window.addEventListener('resize', handleResize);

    fetchData();
  }, [endpoint]);

  function handleResize() {
    // ✅ Console.log removed
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Debug: Current data', data);  // ✅ Guarded - left untouched
  }

  return <div>{loading ? 'Loading...' : JSON.stringify(data)}</div>;
}

// ✅ Deprecated plugin updated automatically
const MiniCssExtractPlugin = require('mini-css-extract-plugin');