FROM valyriantech/ace-step-1.5:latest

# Install supervisor for process management (crash recovery for memory leak workaround)
# See: https://github.com/ace-step/ace-step/issues/142
RUN apt-get update && apt-get install -y supervisor && rm -rf /var/lib/apt/lists/*

# Copy supervisord config for ACE-Step API
COPY supervisord.conf /etc/supervisor/conf.d/acestep.conf

# Create log directory on the persistent workspace volume
RUN mkdir -p /workspace/logs

# Use supervisord as PID 1 — it will launch and restart acestep-api
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
