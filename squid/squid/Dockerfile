FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y squid gettext

COPY squid.conf.template /etc/squid/squid.conf.template
COPY squid-ca.pem /etc/squid/squid-ca.pem
COPY squid-ca.der /etc/squid/squid-ca.der
COPY entrypoint.sh /entrypoint.sh

CMD ["/entrypoint.sh"]

