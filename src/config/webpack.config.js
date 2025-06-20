const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  // Entry points for the application
  // Main entry for web-based reporting interface
  entry: {
    main: './src/web/index.js',
    // Separate entry for report viewer functionality
    reportViewer: './src/web/reportViewer.js',
    // Entry for any dashboard components
    dashboard: './src/web/dashboard.js'
  },

  // Output configuration
  output: {
    // Output directory for built files
    path: path.resolve(__dirname, 'dist'),
    // Use contenthash for cache busting in production
    filename: isProduction
      ? 'js/[name].[contenthash:8].js'
      : 'js/[name].js',
    // Chunk naming pattern
    chunkFilename: isProduction
      ? 'js/[name].[contenthash:8].chunk.js'
      : 'js/[name].chunk.js',
    // Public path for assets (can be CDN URL in production)
    publicPath: '/',
    // Clean output directory before build
    clean: true,
    // Asset module filename
    assetModuleFilename: 'assets/[name].[hash][ext]'
  },

  // Set mode based on NODE_ENV
  mode: isProduction ? 'production' : 'development',

  // Source maps configuration
  // Use source-map for production (external source maps)
  // Use eval-source-map for development (faster rebuilds)
  devtool: isProduction ? 'source-map' : 'eval-source-map',

  // Module resolution
  resolve: {
    // Extensions to resolve
    extensions: ['.js', '.jsx', '.json', '.css'],
    // Aliases for cleaner imports
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@core': path.resolve(__dirname, 'src/core')
    },
    // Prefer ES modules
    mainFields: ['module', 'main']
  },

  // Module rules for different file types
  module: {
    rules: [
      // JavaScript and JSX files
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                // Only include polyfills for browsers we support
                useBuiltIns: 'usage',
                corejs: 3,
                modules: false
              }],
              // If using React for report visualization
              '@babel/preset-react'
            ],
            plugins: [
              // Enable dynamic imports
              '@babel/plugin-syntax-dynamic-import',
              // Class properties
              '@babel/plugin-proposal-class-properties',
              // Optional chaining
              '@babel/plugin-proposal-optional-chaining',
              // Nullish coalescing
              '@babel/plugin-proposal-nullish-coalescing-operator'
            ],
            // Cache babel compilation results
            cacheDirectory: true
          }
        }
      },

      // CSS files
      {
        test: /\.css$/,
        use: [
          // Extract CSS in production, use style-loader in dev
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              // Enable CSS modules
              modules: {
                auto: true,
                localIdentName: isProduction
                  ? '[hash:base64:8]'
                  : '[path][name]__[local]--[hash:base64:5]'
              },
              // Enable source maps
              sourceMap: !isProduction,
              // Import loaders
              importLoaders: 1
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  // Add vendor prefixes
                  'autoprefixer',
                  // Minify CSS in production
                  isProduction && 'cssnano'
                ].filter(Boolean)
              }
            }
          }
        ]
      },

      // Images and assets
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            // Inline images smaller than 8kb
            maxSize: 8 * 1024
          }
        }
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      },

      // Worker scripts (if needed for heavy processing)
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' }
      }
    ]
  },

  // Optimization configuration
  optimization: {
    // Only minimize in production
    minimize: isProduction,
    minimizer: [
      // JavaScript minification
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: isProduction
          },
          mangle: {
            safari10: true
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true
          }
        },
        // Use parallel processing
        parallel: true
      }),
      // CSS minification
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true }
            }
          ]
        }
      })
    ],
    // Split chunks configuration
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for node_modules
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true
        },
        // Common chunk for shared code
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        },
        // Separate chunk for styles
        styles: {
          name: 'styles',
          type: 'css/mini-extract',
          chunks: 'all',
          enforce: true
        }
      }
    },
    // Keep runtime chunk separate for long-term caching
    runtimeChunk: {
      name: 'runtime'
    },
    // Module IDs for long-term caching
    moduleIds: 'deterministic'
  },

  // Plugins configuration
  plugins: [
    // Clean output directory before each build
    new CleanWebpackPlugin(),

    // Define environment variables
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.VERSION': JSON.stringify(require('./package.json').version),
      'process.env.BUILD_DATE': JSON.stringify(new Date().toISOString())
    }),

    // Extract CSS into separate files in production
    isProduction && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css'
    }),

    // Generate HTML files for web interfaces
    new HtmlWebpackPlugin({
      template: './src/web/templates/index.html',
      filename: 'index.html',
      chunks: ['runtime', 'vendors', 'main'],
      inject: true,
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false
    }),

    // Report viewer HTML
    new HtmlWebpackPlugin({
      template: './src/web/templates/report.html',
      filename: 'report.html',
      chunks: ['runtime', 'vendors', 'reportViewer'],
      inject: true,
      minify: isProduction
    }),

    // Dashboard HTML
    new HtmlWebpackPlugin({
      template: './src/web/templates/dashboard.html',
      filename: 'dashboard.html',
      chunks: ['runtime', 'vendors', 'dashboard'],
      inject: true,
      minify: isProduction
    }),

    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '',
          globOptions: {
            ignore: ['**/index.html', '**/.DS_Store']
          }
        }
      ]
    })
  ].filter(Boolean),

  // Development server configuration
  devServer: {
    // Content base
    static: {
      directory: path.join(__dirname, 'public')
    },
    // Enable gzip compression
    compress: true,
    // Port
    port: 8080,
    // Open browser
    open: true,
    // Enable HMR
    hot: true,
    // History API fallback for SPA routing
    historyApiFallback: true,
    // Overlay errors in browser
    client: {
      overlay: {
        errors: true,
        warnings: false
      },
      progress: true
    },
    // Proxy API requests to backend (adjust as needed)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  // Performance hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },

  // Stats output configuration
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false
  },

  // Node.js polyfills (disable for smaller bundle)
  node: {
    global: false,
    __filename: false,
    __dirname: false
  },

  // Target environment
  target: 'web'
};