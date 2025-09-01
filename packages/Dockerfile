# Start with Ubuntu
FROM ubuntu:22.04

# Install required build tools
RUN apt-get update && apt-get install -y \
    autoconf \
    automake \
    build-essential \
    cmake \
    git \
    libass-dev \
    libfreetype6-dev \
    libsdl2-dev \
    libtool \
    libva-dev \
    libvdpau-dev \
    libvorbis-dev \
    libxcb1-dev \
    libxcb-shm0-dev \
    libxcb-xfixes0-dev \
    meson \
    ninja-build \
    pkg-config \
    texinfo \
    wget \
    yasm \
    zlib1g-dev \
    libx264-dev \
    libx265-dev \
    libnuma-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /ffmpeg

# Copy FFmpeg source into container
COPY . .

# Configure and build FFmpeg
RUN ./configure --enable-gpl --enable-libx264 --enable-libx265 && \
    make -j$(nproc) && \
    make install

# Verify installation
RUN ffmpeg -version

# Set default command
CMD ["ffmpeg", "-version"]
