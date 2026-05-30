import * as cdk from 'aws-cdk-lib/core';
import * as iam from "aws-cdk-lib/aws-iam";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors, TokenAuthorizer, GatewayResponse, ResponseType } from "aws-cdk-lib/aws-apigateway";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { EventType } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket
    const importBucket = new Bucket(this, "import-bucket", {
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
      runtime: Runtime.NODEJS_22_X,
    }

    const importProductsFile = new NodejsFunction(this, "importProductsFile", {
      entry: "lambda/importProductsFile.ts",
      handler: "importProductsFile",
      ...nodeJsFunctionProps,
    });

    const basicAuthorizerFn = Function.fromFunctionAttributes(this, 'BasicAuthorizerFn', {
      functionArn: cdk.Fn.importValue('BasicAuthorizerArn'),
      sameEnvironment: true,
    });

    basicAuthorizerFn.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    const authorizer = new TokenAuthorizer(this, 'BasicAuthorizer', {
      handler: basicAuthorizerFn,
    });

    const importApi = new RestApi(this, "ImportApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      }
    });
    new GatewayResponse(this, 'UnauthorizedResponse', {
      restApi: importApi,
      type: ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });
    new GatewayResponse(this, 'AccessDeniedResponse', {
      restApi: importApi,
      type: ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    const importResource = importApi.root.addResource("import");
    importResource.addMethod("GET", new LambdaIntegration(importProductsFile), {
      requestParameters: {
        "method.request.querystring.name": true,
      },
      authorizer,
    });

    importBucket.grantPut(importProductsFile);

    
    const catalogItemsQueue = Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      cdk.Fn.importValue("CatalogItemsQueueArn")
    );

    const importFileParser = new NodejsFunction(this, "importFileParser", {
      entry: "lambda/importFileParser.ts",
      handler: "importFileParser",
      ...nodeJsFunctionProps,
      environment: {
        ...nodeJsFunctionProps.environment,
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });

    importBucket.grantReadWrite(importFileParser);
    catalogItemsQueue.grantSendMessages(importFileParser);

    importFileParser.addEventSource(
      new S3EventSource(importBucket, {
        events: [EventType.OBJECT_CREATED],
        filters: [
          { prefix: "uploaded/" }
        ],
      })
    );
  }
}
