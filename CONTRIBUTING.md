# Contributing to Media Infotech Corporate Portal

Thank you for considering contributing to the Media Infotech Corporate Management System!

## Getting Started

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/your-org/mediainfotech-portal.git
   cd mediainfotech-portal
   ```

2. **Install Dependencies**:
   ```bash
   # Install server & web dependencies
   cd Mediainfotech-Server && npm install
   cd ../Mediainfotech-Web && npm install
   ```

3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env` in `Mediainfotech-Server`
   - Copy `.env.example` to `.env.local` in `Mediainfotech-Web`

4. **Run Development Mode**:
   ```bash
   # From project root
   npm run dev
   ```

## Development & Code Standards

- **TypeScript Verification**: Before submitting a PR, ensure `npm run check-types` completes with 0 errors.
- **Git Commit Guidelines**: Use descriptive conventional commit messages (e.g. `feat: add attendance geofencing`, `fix: history page array extraction`).
- **PR Submission**: Ensure your pull request targets the `main` or `dev` branch and fills out the PR template.
