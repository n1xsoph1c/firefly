#!/bin/bash

# Script to replace all remaining hardcoded rafis.cloud references with environment variables

echo "Updating share pages and API routes..."

# Update share token page
sed - i '1 a\import { APP_NAME } from "@/lib/constants";' src / app / share / [token] / page.tsx
sed - i 's/rafis\.cloud/{APP_NAME}/g' src / app / share / [token] / page.tsx

# Update shared username slug layout
sed - i "1 a\import { APP_URL } from '@/lib/constants';" src / app / shared / [username] / [slug] / layout.tsx
sed - i "s|process.env.NEXTAUTH_URL || 'https://rafis.cloud'|APP_URL|g" src / app / shared / [username] / [slug] / layout.tsx

# Update shared username slug filename layout
sed - i "1 a\import { APP_URL } from '@/lib/constants';" src / app / shared / [username] / [slug] / [[...filename]] / layout.tsx
sed - i "s|process.env.NEXTAUTH_URL || 'https://rafis.cloud'|APP_URL|g" src / app / shared / [username] / [slug] / [[...filename]] / layout.tsx

# Update shared username slug filename page
sed - i '1 a\import { APP_NAME } from "@/lib/constants";' src / app / shared / [username] / [slug] / [[...filename]] / page.tsx
sed - i 's/alt="rafis\.cloud"/alt={APP_NAME}/g' src / app / shared / [username] / [slug] / [[...filename]] / page.tsx
sed - i 's/rafis\.cloud/{APP_NAME}/g' src / app / shared / [username] / [slug] / [[...filename]] / page.tsx

# Update API route
sed - i "1 a\import { NEXT_PUBLIC_BASE_URL } from '@/lib/constants';" src / app / api / folders / [id] / public / route.ts
sed - i "s|process.env.NEXT_PUBLIC_BASE_URL || 'https://rafis.cloud'|NEXT_PUBLIC_BASE_URL|g" src / app / shared / [username] / [slug] / [[...filename]] / layout.tsx file to "firefly" and updated working directory path