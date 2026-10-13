// Jenkins equivalent of .github/workflows/e2e.yml.
// Runs inside the official Playwright image (browsers + OS deps preinstalled).
// Requires plugins: Docker Pipeline, JUnit, HTML Publisher.
pipeline {
  agent {
    docker {
      // Keep the tag in sync with @playwright/test in package.json.
      image 'mcr.microsoft.com/playwright:v1.64.0-noble'
      args '--ipc=host'
    }
  }

  parameters {
    choice(name: 'PROJECT', choices: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari', 'api', 'perf', 'all'], description: 'Playwright project')
    string(name: 'GREP', defaultValue: '', description: 'Tag/title filter, e.g. @smoke or TC-ORDER-001')
    string(name: 'TEST_ENV', defaultValue: 'prod', description: 'Target environment')
  }

  triggers { cron('H 1 * * *') } // nightly

  environment {
    CI = 'true'
    TEST_ENV = "${params.TEST_ENV}"
    HOME = "${env.WORKSPACE}" // npm cache inside the workspace for the container user
  }

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
  }

  stages {
    stage('Install') {
      steps { sh 'npm ci' }
    }
    stage('Lint & typecheck') {
      steps { sh 'npm run lint && npm run typecheck' }
    }
    stage('Test') {
      steps {
        script {
          def project = params.PROJECT == 'all' ? '' : "--project=${params.PROJECT}"
          def grep = params.GREP?.trim() ? "--grep \"${params.GREP}\"" : ''
          sh "npx playwright test ${project} ${grep}"
        }
      }
    }
  }

  post {
    always {
      sh 'node scripts/summarize-results.mjs || true'
      junit allowEmptyResults: true, testResults: 'reports/junit/results.xml'
      publishHTML(target: [reportDir: 'reports/html', reportFiles: 'index.html', reportName: 'Playwright Report', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
      archiveArtifacts artifacts: 'reports/**, test-results/**', allowEmptyArchive: true
    }
  }
}
