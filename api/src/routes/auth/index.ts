import { Hono } from 'hono';
import getSession from './getSession.js';
import login from './login.js';
import logout from './logout.js';
import logoutAll from './logoutAll.js';
import refresh from './refresh.js';
import register from './register.js';

const app = new Hono();

app.route('/register', register);
app.route('/login', login);
app.route('/logout', logout);
app.route('/logout-all', logoutAll);
app.route('/session', getSession);
app.route('/refresh', refresh);

export default app;
