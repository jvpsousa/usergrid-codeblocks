var restify  = require('restify');
var request  = require('request');

var config = null;

var server = restify.createServer();

server
	.use(restify.fullResponse())
	.use(restify.bodyParser())
	.use(restify.CORS({
		origins:['*']
	}));

var routes = {};

var usergridConfig = {};

function _init(config) {
		usergridConfig = config;
}


function _route(route, method, authRequired, requiredRole, callback) {

	var baseRoute = traitUrl(route);
	routes[baseRoute] = {
		authRequired: authRequired,
		requiredRole: requiredRole
	};

	var routeFilter = function(req, res, next) {

		var requestRoute = traitUrl(req.url);

		if(routes[requestRoute].authRequired) {

			var baseUrl = usergridConfig.baseUrl+'/'+usergridConfig.orgId+'/'+usergridConfig.appId;
			console.log('baseURL: '+baseUrl);

			request({
				method: 'GET',
				uri: baseUrl+'/users/me',
				headers: {
					'Authorization': 'Bearer '+ req.body.usergridToken
				}
			}, function(error, response, body) {

				body = JSON.parse(body);

				if(error || body.error) {

					res.contentType = 'json';
					res.send(403, {error: 'You must be logged in to access this route !'});
					res.end();

				} else {

					if(routes[requestRoute].requiredRole != null) {

						var rolesUrl = baseUrl+body.entities[0].metadata.sets.rolenames;

						request({
							method: 'GET',
							uri: rolesUrl,
							headers: {
								'Authorization': 'Bearer '+ req.body.usergridToken
							}
						}, function(error, response, body) {

							body = JSON.parse(body);

							if(error || body.error) {

								res.contentType = 'json';
								res.send(500, {error: 'Ops, something wrong !'});
								res.end();

							} else {

								if(body.entities.length == 1 && body.entities[0].name == routes[requestRoute].requiredRole) {
									callback(req, res, next);
								} else {

									res.contentType = 'json';
									res.send(403, {error: 'You have no permission to access this route !'});
									res.end();

								}
							}

						});

					}
				}

			});

		}
	}

	if(method == 'POST') server.post(route, callback);

}

function _run(port, callback) {
	server.listen(port, callback);
}

function traitUrl(url) {
	var split = url.split('/');
	return '/'+split[1];
}

var usergridCodeblocks = {
	init: _init,
	route:  _route,
	run: _run
}

module.exports = usergridCodeblocks;
