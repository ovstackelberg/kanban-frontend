FROM nginx:alpine

COPY index.html           /usr/share/nginx/html/
COPY style.css            /usr/share/nginx/html/
COPY app.js               /usr/share/nginx/html/
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
