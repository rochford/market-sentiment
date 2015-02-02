# market-sentiment
Harvest Tweets about stocks and score them and place in a database for analysis

Sample project to show how a Business Logic Server does not need to perform slow input / output operations to disk or network.
The architecture is this:
1) Input Server:
This server receives Tweets about stocks and sends them on an input queue to the Business Logic Server.

2) Business Logic Server:
This server processes the input queue and using a sentiment library, scores the tweets for positivity/negativity. Information about the tweet and its score are sent on the outbound message queue. 
The business logic server does not have to perform other IO operations.

3) Output Server:
This server processes the output queue and writess the data to a MongoDB database for future analysis.

