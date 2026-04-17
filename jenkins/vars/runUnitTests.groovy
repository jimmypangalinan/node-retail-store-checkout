/**
 * runUnitTests.groovy
 *
 * Jenkins Shared Library function for running unit tests inside a Docker container.
 * Builds a dedicated test image, executes Jest unit tests with coverage, publishes
 * JUnit XML results, and archives HTML/LCOV coverage reports.
 *
 * Usage:
 *   runUnitTests([
 *     imageFullPath : 'registry.example.com/myapp',   // required
 *     imageTag      : 'latest',                        // required
 *     appName       : 'node-retail-store-checkout',    // required
 *     nodeEnv       : 'test',                          // optional, default: 'test'
 *     coverageDir   : 'coverage',                      // optional, default: 'coverage'
 *     reportsDir    : 'reports',                       // optional, default: 'reports'
 *   ])
 */
def call(Map params = [:]) {
    // -----------------------------------------------------------------------
    // 1. Parameter validation
    // -----------------------------------------------------------------------
    def required = ['imageFullPath', 'imageTag', 'appName']
    required.each { key ->
        if (!params.containsKey(key) || !params[key]) {
            error "[runUnitTests] Required parameter '${key}' is missing or empty."
        }
    }

    def imageFullPath = params.imageFullPath
    def imageTag      = params.imageTag
    def appName       = params.appName
    def nodeEnv       = params.get('nodeEnv', 'test')
    def coverageDir   = params.get('coverageDir', 'coverage')
    def reportsDir    = params.get('reportsDir', 'reports')

    def testImage     = "${imageFullPath}:${imageTag}-test"
    def containerName = "${appName}-test-${env.BUILD_NUMBER}"

    echo """
[runUnitTests] Starting unit test execution
  App Name    : ${appName}
  Image       : ${testImage}
  Node Env    : ${nodeEnv}
  Coverage Dir: ${coverageDir}
  Reports Dir : ${reportsDir}
"""

    // -----------------------------------------------------------------------
    // 2. Build the test Docker image (targets the 'test' stage)
    // -----------------------------------------------------------------------
    echo "[runUnitTests] Building test Docker image: ${testImage}"
    sh """
        docker build \
          --target test \
          --tag ${testImage} \
          --build-arg NODE_ENV=${nodeEnv} \
          --file Dockerfile \
          .
    """

    // -----------------------------------------------------------------------
    // 3. Execute unit tests inside the container
    // -----------------------------------------------------------------------
    echo "[runUnitTests] Running unit tests in container: ${containerName}"

    try {
        sh """
            docker run \
              --rm \
              --name ${containerName} \
              --env NODE_ENV=${nodeEnv} \
              -v \$(pwd)/${reportsDir}:/usr/src/app/${reportsDir} \
              -v \$(pwd)/${coverageDir}:/usr/src/app/${coverageDir} \
              ${testImage}
        """
        echo "[runUnitTests] Unit tests passed."

    } catch (err) {
        echo "[runUnitTests] Unit tests FAILED: ${err.getMessage()}"
        // Still collect reports before re-throwing
        _publishReports(reportsDir, coverageDir)
        throw err

    } finally {
        // Ensure container is removed even if the rm flag was not honored
        sh "docker rm -f ${containerName} || true"
    }

    // -----------------------------------------------------------------------
    // 4. Publish test results and coverage reports
    // -----------------------------------------------------------------------
    _publishReports(reportsDir, coverageDir)
}

// ---------------------------------------------------------------------------
// Private helper: publish JUnit results and HTML coverage
// ---------------------------------------------------------------------------
private def _publishReports(String reportsDir, String coverageDir) {
    echo "[runUnitTests] Publishing test results and coverage reports"

    // JUnit XML (test results)
    if (fileExists("${reportsDir}/junit.xml")) {
        junit testResults: "${reportsDir}/junit.xml",
              allowEmptyResults: false
        echo "[runUnitTests] JUnit test results published from ${reportsDir}/junit.xml"
    } else {
        echo "[runUnitTests] WARNING: JUnit report not found at ${reportsDir}/junit.xml"
    }

    // HTML coverage report
    if (fileExists("${coverageDir}/lcov-report/index.html")) {
        publishHTML(target: [
            allowMissing         : false,
            alwaysLinkToLastBuild: true,
            keepAll              : true,
            reportDir            : "${coverageDir}/lcov-report",
            reportFiles          : 'index.html',
            reportName           : 'Code Coverage Report',
        ])
        echo "[runUnitTests] HTML coverage report published from ${coverageDir}/lcov-report"
    } else {
        echo "[runUnitTests] WARNING: HTML coverage report not found at ${coverageDir}/lcov-report/index.html"
    }

    // Archive raw coverage artifacts (lcov, json-summary) for SonarQube / downstream use
    archiveArtifacts artifacts: "${coverageDir}/lcov.info, ${coverageDir}/coverage-final.json, ${coverageDir}/coverage-summary.json",
                     allowEmptyArchive: true
    echo "[runUnitTests] Coverage artifacts archived"
}
