import * as cdk from 'aws-cdk-lib/core';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const envFile = path.resolve(__dirname, '../.env');
    const envVars = fs.existsSync(envFile)
      ? dotenv.parse(fs.readFileSync(envFile))
      : {};

    const basicAuthorizerFn = new NodejsFunction(this, 'basicAuthorizer', {
      entry: 'lambda/basicAuthorizer.ts',
      handler: 'basicAuthorizer',
      runtime: Runtime.NODEJS_22_X,
      environment: envVars,
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizerFn.functionArn,
      exportName: 'BasicAuthorizerArn',
    });
  }
}
