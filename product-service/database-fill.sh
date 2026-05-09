#!/usr/bin/env bash

log() {
   echo -e "${GREEN}[INFO]${NC}  $*";
}

generate_uuid() {
    uuidgen | tr '[:upper:]' '[:lower:]'
}

# Usage: put_product "title" "description" price count
put_product() {
    local title="$1"
    local description="$2"
    local price="$3"
    local count="$4"
    local id=$(generate_uuid)

    local product_item="{
      \"id\": { \"S\": \"$id\" },
      \"title\": { \"S\": \"$title\" },
      \"description\": { \"S\": \"$description\" },
      \"price\": { \"N\": \"$price\" }
    }"
    
    local stocks_item="{
      \"product_id\": { \"S\": \"$id\" },
      \"count\": { \"N\": \"$count\" }
    }"

    aws dynamodb put-item --table-name products \
        --item "$product_item"
    aws dynamodb put-item --table-name stocks \
        --item "$stocks_item"

    log "Inserted: [$id] $title ($description) - \$$price - $count"
}

put_product "Sennheiser HD800" "The best open Sennheiser headphones" 1800 15
put_product "Sennheiser HD820" "The best closed Sennheiser headphones" 2000 5
put_product "Sennheiser Momentum 3" "The best wireless Sennheiser headphones" 200 20
put_product "Apple AirPods" "Simple AirPods Generation 2" 150 20
put_product "Apple AirPods Pro" "The best Apple headphones" 200 10
put_product "Sennheiser HD600" "Sennheiser HD600 the best headphones" 300 25
