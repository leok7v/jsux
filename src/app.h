#ifndef APP_H
#define APP_H

#ifdef __cplusplus
extern "C" {
#endif

struct app {
    void (*start)(void);
    void (*inactive)(void);
    void (*stop)(void);
};

extern struct app app;

#ifdef __cplusplus
}
#endif

#endif /* APP_H */
    
