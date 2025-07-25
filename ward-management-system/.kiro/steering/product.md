# Ward Management System

A Next.js application for managing coordinators and wards across a state, with report collection and analysis capabilities.

## Core Purpose

The system manages a hierarchical structure of 30 coordinators statewide, each overseeing 10-20 wards, facilitating the collection and analysis of weekly reports from both coordinators and ward administrators.

## User Roles

- **State Admin**: Full system access, manages all users, creates forms, views all reports
- **Coordinator**: District-level management, creates ward admins, submits coordinator reports, views ward reports in their district
- **Ward Admin**: Ward-level users who submit weekly ward progress reports

## Key Features

- Dynamic form creation for weekly reports
- Two report types: Coordinator Work Reports and Ward Work Progress Reports
- Excel export functionality for data analysis
- Role-based authentication and authorization
- Activity logging and audit trails
- Document and instruction management

## Authentication Model

- State Admin: Email/password authentication
- Coordinator & Ward Admin: Mobile number/4-digit PIN authentication
