import pg from 'pg';

const NEON_DB_URL = "postgresql://Leaderboard_owner:6i0VTIBxuwrq@ep-square-brook-a56bzbfg.us-east-2.aws.neon.tech/Leaderboard?sslmode=require";

const client = new pg.Client({
    connectionString: NEON_DB_URL
});

await client.connect();

// Handler function
export async function handler(event) {
    console.log('Event:', event);
    try {
        const httpMethod = event.requestContext.httpMethod;
        const path = event.requestContext.path;

        console.log(`HTTP method: ${httpMethod}`);
        console.log(`Path: ${path}`);

        if (httpMethod === 'POST' && path === '/points') {
            const body = JSON.parse(event.body);
            const { userID, points } = body;
            return await addPoints(userID, points);
        } else if (httpMethod === 'GET' && path === '/leaderboard') {
            const limit = event.queryStringParameters?.limit || 10;
            return await getLeaderboard(limit);
        } else if (httpMethod === 'GET' && path.startsWith('/participant/')) {
            const userID = event.pathParameters.userID;
            return await getParticipantPoints(userID);
        } else if (httpMethod === 'DELETE' && path.startsWith('/participant/')) {
            const userID = event.pathParameters.userID;
            return await deleteParticipant(userID);
        } else if (httpMethod === 'GET') {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Welcome to the Leaderboard API' })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid request' })
            };
        }
    } catch (e) {
        console.error(e);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: e.message })
        };
    }
}

// Function to retrieve the leaderboard
async function getLeaderboard(limit) {
    try {
        const res = await client.query('SELECT * FROM leaderboard ORDER BY points DESC LIMIT $1', [limit]);
        return {
            statusCode: 200,
            body: JSON.stringify(res.rows)
        };
    } catch (err) {
        console.error('Error getting leaderboard:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message })
        };
    }
}

// Function to get points for a specific participant
async function getParticipantPoints(userID) {
    try {
        const res = await client.query('SELECT * FROM leaderboard WHERE user_id = $1', [userID]);
        if (res.rows.length) {
            return {
                statusCode: 200,
                body: JSON.stringify(res.rows[0])
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Participant not found' })
            };
        }
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message })
        };
    }
}

// Function to add points to a participant's score
async function addPoints(userID, pointsToAdd) {
    try {
        let res = await client.query('UPDATE leaderboard SET points = points + $1 WHERE user_id = $2 RETURNING points', [pointsToAdd, userID]);
        if (res.rows.length === 0) {
            res = await client.query('INSERT INTO leaderboard (user_id, points) VALUES ($1, $2) RETURNING points', [userID, pointsToAdd]);
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ message: `User ${userID} now has ${res.rows[0].points} points` })
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message })
        };
    }
}

// Function to delete a participant from the leaderboard
async function deleteParticipant(userID) {
    try {
        await client.query('DELETE FROM leaderboard WHERE user_id = $1', [userID]);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: `User ${userID} deleted from leaderboard` })
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message })
        };
    }
}
