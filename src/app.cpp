#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <pthread.h>
#include <time.h>
#include <unistd.h>
#include "app.h"

extern "C" {

#define countof(a) (sizeof(a) / sizeof((a)[0]))

static void start(void) {
    printf("start\n");
}

static void inactive(void) {
    printf("inactive\n");
}

static void stop(void) {
    printf("stop\n");
}

extern struct app app = {
    .start = start,
    .inactive = inactive,
    .stop = stop
};


}

