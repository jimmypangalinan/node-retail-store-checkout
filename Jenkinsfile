/**
 * Jenkinsfile
 *
 * Declarative pipeline for building, testing, and publishing the
 * node-retail-store-checkout NestJS service.
 *
 * Requires the shared library defined in jenkins/vars/ to be loaded
 * (configured in Jenkins → Manage Jenkins → Global Pipeline Libraries).
 */

def pipelineConfig = readJSON file: 'pipeline.json'

def appName    = pipelineConfig.appName
def imageRepo  = "nexus.example.com/${pipelineConfig.nexusGroup}/${pipelineConfig.nexusProject}"
def imageTag   = env.BUILD_NUMBER ?: 'latest'
def imageFullPath = "${imageRepo}/${appName}"

pipeline {
    agent { label 'docker' }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        NODE_ENV = 'test'
        IMAGE_FULL_PATH = "${imageFullPath}"
        IMAGE_TAG = "${imageTag}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Building ${appName} — branch: ${env.BRANCH_NAME}, build: ${env.BUILD_NUMBER}"
            }
        }

        stage('Unit Test') {
            steps {
                script {
                    runUnitTests(
                        imageFullPath : env.IMAGE_FULL_PATH,
                        imageTag      : env.IMAGE_TAG,
                        appName       : appName,
                        nodeEnv       : env.NODE_ENV,
                        coverageDir   : 'coverage',
                        reportsDir    : 'reports',
                    )
                }
            }
            post {
                always {
                    echo 'Unit Test stage complete.'
                }
            }
        }

        stage('Build Image') {
            steps {
                script {
                    echo "[Build Image] Building production Docker image: ${env.IMAGE_FULL_PATH}:${env.IMAGE_TAG}"
                    sh """
                        docker build \
                          --target build \
                          --tag ${env.IMAGE_FULL_PATH}:${env.IMAGE_TAG} \
                          --file Dockerfile \
                          .
                    """
                }
            }
        }

        stage('Push Image') {
            when {
                anyOf {
                    branch 'main'
                    branch 'development'
                }
            }
            steps {
                script {
                    echo "[Push Image] Pushing ${env.IMAGE_FULL_PATH}:${env.IMAGE_TAG}"
                    sh "docker push ${env.IMAGE_FULL_PATH}:${env.IMAGE_TAG}"
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded for ${appName} build ${env.BUILD_NUMBER}"
        }
        failure {
            echo "Pipeline FAILED for ${appName} build ${env.BUILD_NUMBER}"
        }
        always {
            cleanWs()
        }
    }
}
