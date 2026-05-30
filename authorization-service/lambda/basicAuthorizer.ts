import {
  APIGatewayTokenAuthorizerHandler,
  StatementEffect
} from 'aws-lambda';

export const basicAuthorizer: APIGatewayTokenAuthorizerHandler = async (
  event, context, callback
) => {
  
  console.log('event:', JSON.stringify(event, undefined, 2));
  
  if (!event.authorizationToken) {
    callback('Unauthorized');  // Return a 401 Unauthorized response
  }

  try {
    const [, encoded] = event.authorizationToken.split(' ');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [login, password] = decoded.split(':');
  
    const storedPassword = process.env[login];
    const effect = storedPassword && storedPassword === password ? 'Allow' : 'Deny';
  
    callback(null, generatePolicy('user', effect, event.methodArn));
  } catch (e) {
    console.log(e);
    callback(`Unauthorized: ${e}`);
  }
}

const generatePolicy = function (principalId: string, effect: StatementEffect, resource: string) {
    return {
      principalId: principalId,
      policyDocument: {
          Statement: [{
              Action: 'execute-api:Invoke',
              Effect: effect,
              Resource: resource
          }],
          Version: '2012-10-17'
      }
    };
}