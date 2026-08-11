#!/bin/bash
# Performance Baseline Tests - curl-based timing para la API de MusicProvider
#
# Usage: ./curl-timing.sh [BASE_URL]
# Example: ./curl-timing.sh http://localhost:3000

BASE_URL=${1:-http://localhost:3000}
TEST_VIDEO_ID="XFkzRNyygfk"
TEST_QUERY="Radiohead Creep"
ENCODED_QUERY=$(echo "$TEST_QUERY" | sed 's/ /%20/g')

echo "=========================================================="
echo " Ejecutando Performance Baseline Tests con curl"
echo " Objetivo: $BASE_URL"
echo "=========================================================="

# Función auxiliar para hacer petición y extraer timing
measure_endpoint() {
    local ENDPOINT_NAME=$1
    local URL=$2
    local OUTPUT_FILE=$(mktemp)
    
    echo "Testeando: $ENDPOINT_NAME"
    echo "URL: $URL"
    
    # curl output format para extraer métricas de tiempo
    CURL_FORMAT='{"http_code": %{http_code}, "time_namelookup": %{time_namelookup}, "time_connect": %{time_connect}, "time_starttransfer": %{time_starttransfer}, "time_total": %{time_total}, "size_download": %{size_download}}\n'
    
    local RESULT=$(curl -s -w "$CURL_FORMAT" -o "$OUTPUT_FILE" "$URL")
    
    # Check si hubo un problema parseando o conectando
    if [ $? -ne 0 ]; then
        echo "❌ Error al conectar con $URL"
    else
        local HTTP_CODE=$(echo "$RESULT" | grep -o '"http_code": [0-9]*' | awk '{print $2}')
        local TIME_TOTAL=$(echo "$RESULT" | grep -o '"time_total": [0-9.]*' | awk '{print $2}')
        local TTFB=$(echo "$RESULT" | grep -o '"time_starttransfer": [0-9.]*' | awk '{print $2}')
        
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ]; then
            echo "✅ SUCCESS (HTTP $HTTP_CODE)"
            echo "   Tiempo Total : ${TIME_TOTAL}s"
            echo "   TTFB (Latencia): ${TTFB}s"
        else
            echo "❌ FAILED (HTTP $HTTP_CODE)"
            cat "$OUTPUT_FILE"
        fi
    fi
    echo "----------------------------------------------------------"
    rm -f "$OUTPUT_FILE"
}

measure_endpoint "Search API (GET /api/search)" "$BASE_URL/api/search?q=$ENCODED_QUERY&limit=1"
measure_endpoint "Info API (GET /api/info)" "$BASE_URL/api/info?url=https://www.youtube.com/watch?v=$TEST_VIDEO_ID"
measure_endpoint "Resolve API (GET /api/audio/resolve)" "$BASE_URL/api/audio/resolve?videoId=$TEST_VIDEO_ID"

echo "Testeando Stream API (GET /api/audio/stream) con Range Header..."
OUTPUT_FILE=$(mktemp)
CURL_FORMAT='{"http_code": %{http_code}, "time_total": %{time_total}, "time_starttransfer": %{time_starttransfer}}\n'
RESULT=$(curl -s -r 0-1024 -w "$CURL_FORMAT" -o "$OUTPUT_FILE" "$BASE_URL/api/audio/stream?videoId=$TEST_VIDEO_ID")
HTTP_CODE=$(echo "$RESULT" | grep -o '"http_code": [0-9]*' | awk '{print $2}')
if [ "$HTTP_CODE" = "206" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS (HTTP $HTTP_CODE)"
    TIME_TOTAL=$(echo "$RESULT" | grep -o '"time_total": [0-9.]*' | awk '{print $2}')
    TTFB=$(echo "$RESULT" | grep -o '"time_starttransfer": [0-9.]*' | awk '{print $2}')
    echo "   Tiempo Total : ${TIME_TOTAL}s"
    echo "   TTFB (Latencia): ${TTFB}s"
else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
fi
rm -f "$OUTPUT_FILE"
echo "=========================================================="
