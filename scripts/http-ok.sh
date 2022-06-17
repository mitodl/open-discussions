#!/usr/bin/env node

// This script sets up a very simple http server responding to /health with a 200 OK.

const http = require('http');

http.createServer(function (req, res) {
    if(req.url === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            server: "healthcheck-ok",
        }));
        return;
    }
    res.writeHead(500);
    res.end(JSON.stringify({
        success: false,
        server: "healthcheck-ok",
        message: "This service is only meant to be queried at /health"
    }));
}).listen(8052);