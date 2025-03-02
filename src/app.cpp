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

void ask(const char* s) {}

const char* answer(const char* i) {
    return "";
}

void start(const char* model) {
    printf("start\n");
}

void inactive(void) {
    printf("inactive\n");
}

void stop(void) {
}

}

