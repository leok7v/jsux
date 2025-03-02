#ifndef APP_H
#define APP_H

#ifdef __cplusplus
extern "C" {
#endif

void start(const char* model);
void ask(const char* question);
const char* answer(const char* interrupt);
void inactive(void);
void stop(void);

#ifdef __cplusplus
}
#endif

#endif /* APP_H */
    
