#!/bin/bash

# Eye of Sauron CLI Usage Examples

# Install globally
npm install -g eye-of-sauron

# Or use with npx
npx eye-of-sauron --help

# 1. Quick scan of current directory
eye-of-sauron --mode quick

# 2. Deep scan of specific directory with JSON output
eye-of-sauron --mode deep --path ./src --output json

# 3. Quantum scan with all output formats
eye-of-sauron --mode quantum --output console,json,html

# 4. Incremental scan (only changed files)
eye-of-sauron --incremental --path ./src

# 5. Parallel scan with 8 workers
eye-of-sauron --parallel 8 --mode deep

# 6. Use custom configuration file
eye-of-sauron --config ./custom-eos-config.json

# 7. Silent mode (only errors)
eye-of-sauron --silent --output json

# 8. Verbose mode (detailed output)
eye-of-sauron --verbose --mode quantum

# 9. Combined options for CI/CD pipeline
eye-of-sauron \
  --mode deep \
  --path ./src \
  --output json,html \
  --parallel 4 \
  --incremental \
  --silent

# 10. Using the short alias
eos --mode quick --path ./lib

# Error Handling Examples

# 11. Invalid path (will show error)
eye-of-sauron --path /non/existent/path
# Error: Scan path does not exist: /non/existent/path

# 12. Invalid mode (will default to 'deep')
eye-of-sauron --mode turbo
# Warning: Invalid mode 'turbo', using 'deep'

# 13. Missing required permissions
eye-of-sauron --path /root/protected
# Error: Permission denied: /root/protected

# 14. Invalid config file
eye-of-sauron --config ./missing-config.json
# Error: Failed to load configuration: ENOENT: no such file or directory

# 15. Debugging with verbose errors
eye-of-sauron --path ./bad-path --verbose
# Fatal error: Scan path does not exist: ./bad-path
# [Full stack trace displayed]